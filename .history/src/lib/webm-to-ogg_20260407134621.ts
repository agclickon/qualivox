/**
 * Pure-JS WebM/Opus → OGG/Opus container converter.
 *
 * Chrome MediaRecorder produces audio/webm;codecs=opus.
 * WhatsApp PTT requires audio/ogg;codecs=opus.
 * The Opus codec frames are identical — only the container differs.
 *
 * This converter:
 *  1. Parses the WebM EBML tree to extract the OpusHead (CodecPrivate) and
 *     all Opus audio packets from SimpleBlock / Block elements.
 *  2. Wraps them in OGG pages with proper CRC-32, granule positions and
 *     segment lacing — producing a valid audio/ogg;codecs=opus buffer.
 *
 * Returns null if parsing fails (caller should fall back to webm).
 */

// ─── EBML helpers (same as fix-webm-duration) ────────────────────────────────

// Sentinel meaning "element has unknown/streaming size — read to buffer end"
const UNKNOWN_SIZE = -1

function readVint(buf: Buffer, pos: number): { value: number; length: number } {
  if (pos >= buf.length) return { value: UNKNOWN_SIZE, length: 1 }
  const first = buf[pos]!
  let length = 1; let mask = 0x80
  while (mask > 0 && !(first & mask)) { mask >>= 1; length++ }
  if (length > 8) return { value: UNKNOWN_SIZE, length: 1 }
  // Use a pair of 16-bit numbers to avoid 32-bit signed overflow for large VINTs
  // hi = upper 16 bits, lo = lower 16 bits
  let hi = 0; let lo = first & (mask - 1)
  for (let i = 1; i < length; i++) {
    hi = ((hi << 8) | (lo >>> 24)) >>> 0
    lo = ((lo << 8) | buf[pos + i]!) >>> 0
  }
  // Detect "all data bits = 1" (unknown/streaming size)
  // For any length, unknown size means every data bit is 1.
  // We detect it as: the original mask bit was stripped, remaining bits all 1.
  // Simpler: reconstruct check — for length 4+, hi will be non-zero for large files
  // but for "all ones" specifically: check the pattern.
  // Known unknown-size bytes per length:
  //   1: 0x7F  2: 0x3FFF  3: 0x1FFFFF  4: 0x0FFFFFFF
  //   5: 0x07FFFFFFFF  6: 0x03FFFFFFFFFF ...
  // We check: if hi === 0, check lo against known masks. If hi > 0, it's a real size.
  const unknownLo = [0, 0x7F, 0x3FFF, 0x1FFFFF, 0x0FFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF]
  const unknownHi = [0, 0, 0, 0, 0, 0x07, 0x03FF, 0x01FFFF, 0x00FFFFFF]
  if (hi === unknownHi[length] && lo === unknownLo[length]) return { value: UNKNOWN_SIZE, length }
  // For our purposes (files < 2GB), hi should always be 0
  return { value: lo, length }
}

function readElementId(buf: Buffer, pos: number): { id: number; length: number } {
  if (pos >= buf.length) return { id: -1, length: 1 }
  const first = buf[pos]!
  let length = 1
  if      (first >= 0x80) length = 1
  else if (first >= 0x40) length = 2
  else if (first >= 0x20) length = 3
  else if (first >= 0x10) length = 4
  else return { id: -1, length: 1 }
  let id = 0
  for (let i = 0; i < length; i++) id = (id << 8) | buf[pos + i]!
  return { id, length }
}

interface El { id: number; dataStart: number; dataSize: number }

// dataSize === UNKNOWN_SIZE means the element extends to the buffer end (streaming WebM)
function parseEl(buf: Buffer, pos: number): El | null {
  if (pos + 2 > buf.length) return null
  const { id, length: idLen } = readElementId(buf, pos)
  if (id < 0) return null
  pos += idLen
  const { value: dataSize, length: sizeLen } = readVint(buf, pos)
  // dataSize === UNKNOWN_SIZE is valid for streaming elements (Segment, Cluster)
  return { id, dataStart: pos + sizeLen, dataSize }
}

function* children(buf: Buffer, start: number, end: number): Generator<El> {
  let pos = start
  while (pos < end && pos < buf.length) {
    const el = parseEl(buf, pos)
    if (!el) break
    yield el
    if (el.dataSize === UNKNOWN_SIZE) break // unknown-size: caller handles internals
    pos = el.dataStart + el.dataSize
  }
}

function readUInt(buf: Buffer, pos: number, len: number): number {
  let v = 0
  for (let i = 0; i < len; i++) v = (v * 256) + (buf[pos + i] ?? 0)
  return v
}

function readFloat32(buf: Buffer, pos: number): number {
  return buf.readFloatBE(pos)
}

// Element IDs
const ID_SEGMENT     = 0x18538067
const ID_INFO        = 0x1549A966
const ID_TIMESCALE   = 0x2AD7B1
const ID_TRACKS      = 0x1654AE6B
const ID_TRACK_ENTRY = 0xAE
const ID_TRACK_TYPE  = 0x83   // value 2 = audio
const ID_CODEC_ID    = 0x86
const ID_CODEC_PRIV  = 0x63A2
const ID_AUDIO_EL    = 0xE1
const ID_SAMP_FREQ   = 0xB5
const ID_CHANNELS    = 0x9F
const ID_CLUSTER     = 0x1F43B675
const ID_TIMECODE    = 0xE7
const ID_SIMPLE_BLK  = 0xA3
const ID_BLOCK_GRP   = 0xA0
const ID_BLOCK       = 0xA1

// ─── OGG CRC-32 ──────────────────────────────────────────────────────────────
// OGG uses CRC-32 with poly 0x04C11DB7 (unreflected, init=0, no final XOR)

const OGG_CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let r = i << 24
    for (let j = 0; j < 8; j++) r = (r & 0x80000000) ? (r << 1) ^ 0x04C11DB7 : r << 1
    t[i] = r >>> 0
  }
  return t
})()

function oggCrc32(buf: Buffer): number {
  let crc = 0
  for (let i = 0; i < buf.length; i++) {
    crc = (OGG_CRC_TABLE[((crc >>> 24) ^ buf[i]) & 0xFF]! ^ (crc << 8)) >>> 0
  }
  return crc
}

// ─── OGG page builder ────────────────────────────────────────────────────────

function makeOggPage(
  packets: Buffer[],
  granulePos: bigint,
  serial: number,
  seqNo: number,
  headerType: number // 0x02=BOS, 0x04=EOS, 0x00=normal
): Buffer {
  // Build segment lacing table (RFC 3533 §6)
  const segs: number[] = []
  for (const p of packets) {
    let rem = p.length
    while (rem >= 255) { segs.push(255); rem -= 255 }
    segs.push(rem)
  }

  const headerLen = 27 + segs.length
  const dataLen   = packets.reduce((s, p) => s + p.length, 0)
  const page      = Buffer.alloc(headerLen + dataLen, 0)

  page.write('OggS', 0, 'ascii')        // capture pattern
  page[4] = 0                           // stream structure version
  page[5] = headerType                  // header type flag
  page.writeBigInt64LE(granulePos, 6)   // granule position
  page.writeUInt32LE(serial >>> 0, 14)  // bitstream serial number
  page.writeUInt32LE(seqNo >>> 0, 18)   // page sequence number
  page.writeUInt32LE(0, 22)             // CRC placeholder
  page[26] = segs.length
  for (let i = 0; i < segs.length; i++) page[27 + i] = segs[i]!

  let off = headerLen
  for (const p of packets) { p.copy(page, off); off += p.length }

  page.writeUInt32LE(oggCrc32(page), 22)
  return page
}

// ─── Opus tag header ─────────────────────────────────────────────────────────

function makeOpusTags(): Buffer {
  const vendor = Buffer.from('LeadFlow', 'utf8')
  const buf = Buffer.alloc(8 + 4 + vendor.length + 4)
  buf.write('OpusTags', 0, 'ascii')
  buf.writeUInt32LE(vendor.length, 8)
  vendor.copy(buf, 12)
  buf.writeUInt32LE(0, 12 + vendor.length) // 0 user comments
  return buf
}

// ─── Main converter ──────────────────────────────────────────────────────────

interface ParsedWebM {
  opusHead: Buffer   // raw OpusHead bytes from CodecPrivate
  timescaleNs: number // nanoseconds per timecode unit (default 1,000,000)
  sampleRate: number  // audio sample rate (typically 48000)
  packets: Array<{ timecodeMs: number; data: Buffer }>
}

function parseWebM(buf: Buffer): ParsedWebM | null {
  // Find Segment — Chrome MediaRecorder uses unknown-size Segment (streaming WebM)
  let pos = 0
  let segEl: El | null = null
  while (pos < buf.length) {
    const el = parseEl(buf, pos)
    if (!el) break
    if (el.id === ID_SEGMENT) { segEl = el; break }
    // Skip known-size elements; unknown-size means we shouldn't advance past it
    if (el.dataSize === UNKNOWN_SIZE) break
    pos = el.dataStart + el.dataSize
  }
  if (!segEl) return null

  const segStart = segEl.dataStart
  // Unknown-size Segment extends to end of file (streaming/live recording)
  const segEnd = (segEl.dataSize === UNKNOWN_SIZE || segEl.dataSize < 0)
    ? buf.length
    : segEl.dataStart + segEl.dataSize

  let timescaleNs = 1_000_000
  let opusHead: Buffer | null = null
  let sampleRate = 48000
  const packets: ParsedWebM['packets'] = []

  // Scan all top-level elements inside Segment linearly.
  // Chrome MediaRecorder produces streaming WebM: Segment + all Clusters have UNKNOWN_SIZE.
  // We detect element boundaries by reading the next element ID at each position.
  // When a Cluster has UNKNOWN_SIZE, it ends where the next top-level element begins.
  // Top-level Segment children we care about: Info, Tracks, Cluster.
  // Top-level IDs (4-byte): 0x1549A966=Info, 0x1654AE6B=Tracks, 0x1F43B675=Cluster
  // We identify them by their 4-byte IDs to detect "next top-level boundary".
  const TOP_LEVEL_IDS = new Set([ID_INFO, ID_TRACKS, ID_CLUSTER,
    0x114D9B74, // SeekHead
    0x1C53BB6B, // Cues
    0x1941A469, // Attachments
    0x1043A770, // Chapters
    0x1254C367, // Tags
  ])

  function nextTopLevelPos(from: number): number {
    let p = from
    while (p < segEnd && p < buf.length) {
      const el = parseEl(buf, p)
      if (!el) break
      if (TOP_LEVEL_IDS.has(el.id)) return p
      if (el.dataSize === UNKNOWN_SIZE) { p++; continue }
      p = el.dataStart + el.dataSize
    }
    return segEnd
  }

  let scanPos = segStart
  while (scanPos < segEnd && scanPos < buf.length) {
    const el = parseEl(buf, scanPos)
    if (!el) break

    // For unknown-size elements, find where the next top-level element starts
    const elEnd = el.dataSize === UNKNOWN_SIZE
      ? nextTopLevelPos(el.dataStart)
      : el.dataStart + el.dataSize

    // Info → TimecodeScale
    if (el.id === ID_INFO) {
      for (const child of children(buf, el.dataStart, elEnd)) {
        if (child.id === ID_TIMESCALE) {
          timescaleNs = readUInt(buf, child.dataStart, child.dataSize)
        }
      }
    }

    // Tracks → find audio Opus track
    if (el.id === ID_TRACKS && !opusHead) {
      for (const entry of children(buf, el.dataStart, elEnd)) {
        if (entry.id !== ID_TRACK_ENTRY) continue
        const entryEnd = entry.dataSize === UNKNOWN_SIZE ? elEnd : entry.dataStart + entry.dataSize
        let isAudio = false; let codecId = ''; let codecPrivate: Buffer | null = null; let sr = 48000
        for (const f of children(buf, entry.dataStart, entryEnd)) {
          if (f.id === ID_TRACK_TYPE && readUInt(buf, f.dataStart, f.dataSize) === 2) isAudio = true
          if (f.id === ID_CODEC_ID) codecId = buf.subarray(f.dataStart, f.dataStart + f.dataSize).toString('ascii')
          if (f.id === ID_CODEC_PRIV) codecPrivate = Buffer.from(buf.subarray(f.dataStart, f.dataStart + f.dataSize))
          if (f.id === ID_AUDIO_EL) {
            const aeEnd = f.dataSize === UNKNOWN_SIZE ? entryEnd : f.dataStart + f.dataSize
            for (const af of children(buf, f.dataStart, aeEnd)) {
              if (af.id === ID_SAMP_FREQ && af.dataSize === 4) sr = Math.round(readFloat32(buf, af.dataStart))
            }
          }
        }
        if (isAudio && codecId.includes('OPUS') && codecPrivate) {
          opusHead = codecPrivate
          sampleRate = sr
        }
      }
    }

    // Cluster → extract SimpleBlock / BlockGroup packets
    if (el.id === ID_CLUSTER) {
      let clusterTime = 0
      // elEnd already accounts for unknown-size via nextTopLevelPos above
      let clusterPos = el.dataStart
      while (clusterPos < elEnd && clusterPos < buf.length) {
        const child = parseEl(buf, clusterPos)
        if (!child) break
        if (child.dataSize === UNKNOWN_SIZE) { clusterPos++; continue }

        if (child.id === ID_TIMECODE) {
          clusterTime = readUInt(buf, child.dataStart, child.dataSize)
        }

        if (child.id === ID_SIMPLE_BLK && child.dataSize >= 3) {
          const { length: trackLen } = readVint(buf, child.dataStart)
          if (child.dataSize >= trackLen + 3) {
            const relTime = buf.readInt16BE(child.dataStart + trackLen)
            const frameStart = child.dataStart + trackLen + 3
            const frameEnd = child.dataStart + child.dataSize
            if (frameEnd > frameStart) {
              packets.push({
                timecodeMs: clusterTime + relTime,
                data: Buffer.from(buf.subarray(frameStart, frameEnd)),
              })
            }
          }
        }

        if (child.id === ID_BLOCK_GRP) {
          const bgEnd = child.dataStart + child.dataSize
          for (const gc of children(buf, child.dataStart, bgEnd)) {
            if (gc.id !== ID_BLOCK || gc.dataSize < 3) continue
            const { length: trackLen } = readVint(buf, gc.dataStart)
            if (gc.dataSize >= trackLen + 3) {
              const relTime = buf.readInt16BE(gc.dataStart + trackLen)
              const frameStart = gc.dataStart + trackLen + 3
              const frameEnd = gc.dataStart + gc.dataSize
              if (frameEnd > frameStart) {
                packets.push({
                  timecodeMs: clusterTime + relTime,
                  data: Buffer.from(buf.subarray(frameStart, frameEnd)),
                })
              }
            }
          }
        }

        clusterPos = child.dataStart + child.dataSize
      }
    }

    // Advance scanPos — for unknown-size, use the boundary we already computed
    scanPos = elEnd
  }

  if (!opusHead || packets.length === 0) return null
  return { opusHead, timescaleNs, sampleRate, packets }
}

/**
 * Read the number of PCM samples (at 48 kHz) encoded in one Opus packet.
 * Each Opus packet starts with a TOC byte that encodes config, stereo, and
 * frame-count code. For code=3 (VBR/CBR multi-frame), the second byte holds
 * the frame count (lower 6 bits). See RFC 6716 §3.2.
 */
function opusPacketSamples(data: Buffer): number {
  if (data.length === 0) return 960 // fallback: 20ms
  const toc = data[0]!
  const config = (toc >> 3) & 0x1F
  // Frame duration in samples at 48 kHz (config → ms × 48)
  const frameSamplesTable = [
    480,960,1920,2880,  // SILK NB  10/20/40/60ms
    480,960,1920,2880,  // SILK MB
    480,960,1920,2880,  // SILK WB
    480,960,1920,2880,  // SILK SWB
    120,240,480,960,    // CELT NB  2.5/5/10/20ms
    120,240,480,960,    // CELT WB
    120,240,480,960,    // CELT SWB
    120,240,480,960,    // CELT FB
  ]
  const samplesPerFrame = frameSamplesTable[config] ?? 960
  const code = toc & 0x3
  let numFrames: number
  if (code === 0) numFrames = 1
  else if (code === 1 || code === 2) numFrames = 2
  else numFrames = data.length > 1 ? (data[1]! & 0x3F) : 1 // code=3: count in byte 1
  return samplesPerFrame * (numFrames || 1)
}

function buildOgg(d: ParsedWebM): Buffer {
  const SERIAL = 0x4C656164 // "Lead" in hex

  const pages: Buffer[] = []
  let seqNo = 0

  // Page 1: OpusHead (BOS)
  pages.push(makeOggPage([d.opusHead], BigInt(0), SERIAL, seqNo++, 0x02))

  // Page 2: OpusTags
  pages.push(makeOggPage([makeOpusTags()], BigInt(0), SERIAL, seqNo++, 0x00))

  // Audio pages — one packet per page.
  // Per RFC 7845, granule position = cumulative PCM samples at end of page.
  // We read each packet's TOC byte to get the real sample count (Chrome packs
  // 3 Opus frames per SimpleBlock → 2880 samples, not 960).
  let cumulativeSamples = BigInt(0)
  for (let i = 0; i < d.packets.length; i++) {
    const pkt = d.packets[i]!
    const isLast = i === d.packets.length - 1
    cumulativeSamples += BigInt(opusPacketSamples(pkt.data))
    pages.push(makeOggPage([pkt.data], cumulativeSamples, SERIAL, seqNo++, isLast ? 0x04 : 0x00))
  }

  return Buffer.concat(pages)
}

// ─── Waveform from PCM (OggOpusDecoder) ─────────────────────────────────────
// Decode the OGG buffer to PCM and compute amplitude per bar.
// WhatsApp expects 64 values 0-100.
async function buildWaveformFromPcm(ogg: Buffer): Promise<Uint8Array> {
  const BARS = 64
  try {
    const { OggOpusDecoder } = await import('ogg-opus-decoder')
    const decoder = new OggOpusDecoder()
    await decoder.ready
    const { channelData } = await decoder.decodeFile(ogg)
    decoder.free()
    const raw = channelData[0]
    if (!raw || raw.length === 0) throw new Error('empty PCM')
    const blockSize = Math.max(1, Math.floor(raw.length / BARS))
    const vals: number[] = []
    for (let i = 0; i < BARS; i++) {
      let sum = 0
      const end = Math.min((i + 1) * blockSize, raw.length)
      for (let j = i * blockSize; j < end; j++) sum += Math.abs(raw[j]!)
      vals.push(sum / (end - i * blockSize))
    }
    
    // Compressão dinâmica usando curva de potência (power curve) - similar ao WhatsApp
    // A curva y = x^0.6 (raiz mais suave) mantém valores baixos mais visíveis
    // e comprime valores altos, criando uma waveform mais natural
    const max = Math.max(...vals, 1e-10)
    const POWER = 0.6 // Expoente da curva - ajustável (0.5 = raiz quadrada, 0.6 = mais linear)
    const result = new Uint8Array(vals.map(v => {
      const normalized = v / max
      // Curva de potência: valores baixos ↑, valores altos ↓, preserva dinâmica
      const curved = Math.pow(normalized, POWER)
      return Math.min(100, Math.max(0, Math.floor(curved * 100)))
    }))
    
    // Log para debug - mostra comparação antes/depois
    const avgOriginal = vals.reduce((a,b)=>a+b,0)/vals.length
    const avgCompressed = result.reduce((a,b)=>a+b,0)/result.length
    console.log(`[buildWaveformFromPcm] max=${max.toFixed(4)} avgOriginal=${avgOriginal.toFixed(4)} avgCompressed=${avgCompressed.toFixed(1)}/100`)
    
    return result
  } catch (err) {
    console.warn('[webmOpusToOgg] waveform PCM fallback:', err)
    return new Uint8Array(BARS)
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function webmOpusToOgg(input: Buffer): Promise<{ buffer: Buffer; mimeType: string; waveform?: Uint8Array; seconds?: number }> {
  try {
    console.log(`[webmOpusToOgg] Iniciando conversão — ${input.length} bytes, primeiros 4 bytes: ${input.slice(0,4).toString('hex')}`)
    const parsed = parseWebM(input)
    if (!parsed) {
      console.warn('[webmOpusToOgg] parseWebM retornou null — não encontrou Segment ou Track de áudio Opus')
      return { buffer: input, mimeType: 'audio/webm; codecs=opus' }
    }
    console.log(`[webmOpusToOgg] Parsed: ${parsed.packets.length} pacotes, sampleRate=${parsed.sampleRate}, timescaleNs=${parsed.timescaleNs}, opusHead=${parsed.opusHead.length} bytes`)
    if (parsed.packets.length === 0) {
      console.warn('[webmOpusToOgg] Nenhum pacote Opus encontrado nos clusters')
      return { buffer: input, mimeType: 'audio/webm; codecs=opus' }
    }
    const ogg = buildOgg(parsed)
    const totalSamples = parsed.packets.reduce((acc, p) => acc + opusPacketSamples(p.data), 0)
    const seconds = Math.round(totalSamples / 48000)
    const waveform = await buildWaveformFromPcm(ogg)
    console.log(`[webmOpusToOgg] Convertido: ${input.length} bytes WebM → ${ogg.length} bytes OGG (${parsed.packets.length} pacotes, ~${seconds}s) waveform nonZero=${waveform.filter(v=>v>0).length}`)
    return { buffer: ogg, mimeType: 'audio/ogg; codecs=opus', waveform, seconds }
  } catch (err) {
    console.warn('[webmOpusToOgg] Falha na conversão:', err)
    return { buffer: input, mimeType: 'audio/webm; codecs=opus' }
  }
}
