// Folio — minimal MessagePack decoder.
// We only need to read a few integers out of a small header for the
// bSmart page files — no need for a full codec.

Folio.msgpack = {
  // Decode a single msgpack value from `buf` starting at `i`.
  // Returns { v, i }. Supports the integer/array/map/string types that
  // occur inside a bSmart file header.
  decode(buf, i = 0) {
    const b = buf[i++];
    if (b === undefined) throw new Error("msgpack: truncated");

    // positive fixint 0x00..0x7f
    if (b <= 0x7f) return { v: b, i };

    // fixmap 0x80..0x8f
    if (b >= 0x80 && b <= 0x8f) {
      const n = b & 0x0f;
      const out = {};
      for (let k = 0; k < n; k++) {
        const key = this.decode(buf, i); i = key.i;
        const val = this.decode(buf, i); i = val.i;
        out[key.v] = val.v;
      }
      return { v: out, i };
    }

    // fixarray 0x90..0x9f
    if (b >= 0x90 && b <= 0x9f) {
      const n = b & 0x0f;
      const out = [];
      for (let k = 0; k < n; k++) {
        const item = this.decode(buf, i); i = item.i;
        out.push(item.v);
      }
      return { v: out, i };
    }

    // fixstr 0xa0..0xbf
    if (b >= 0xa0 && b <= 0xbf) {
      const len = b & 0x1f;
      const s = this.text(buf, i, len); i += len;
      return { v: s, i };
    }

    // negative fixint 0xe0..0xff
    if (b >= 0xe0) return { v: b - 0x100, i };

    switch (b) {
      case 0xc0: return { v: null, i };
      case 0xc2: return { v: false, i };
      case 0xc3: return { v: true, i };
      case 0xcc: return { v: buf[i++], i };                       // uint8
      case 0xcd: return { v: this.u16(buf, i), i: i + 2 };        // uint16
      case 0xce: return { v: this.u32(buf, i), i: i + 4 };        // uint32
      case 0xcf: return { v: this.f64(buf, i), i: i + 8 };        // uint64 (as number)
      case 0xd0: return { v: buf[i++], i };                       // int8
      case 0xd1: return { v: this.i16(buf, i), i: i + 2 };        // int16
      case 0xd2: return { v: this.i32(buf, i), i: i + 4 };        // int32
      case 0xd9: { const len = buf[i++]; const s = this.text(buf, i, len); return { v: s, i: i + len }; } // str8
      case 0xda: { const len = this.u16(buf, i); i += 2; const s = this.text(buf, i, len); return { v: s, i: i + len }; } // str16
      case 0xdc: { const n = this.u16(buf, i); i += 2; const out = []; for (let k = 0; k < n; k++) { const it = this.decode(buf, i); i = it.i; out.push(it.v); } return { v: out, i }; } // array16
      case 0xde: { const n = this.u16(buf, i); i += 2; const out = {}; for (let k = 0; k < n; k++) { const key = this.decode(buf, i); i = key.i; const val = this.decode(buf, i); i = val.i; out[key.v] = val.v; } return { v: out, i }; } // map16
      default:
        throw new Error("msgpack: unsupported byte 0x" + b.toString(16));
    }
  },

  u16(buf, i) { return (buf[i] << 8) | buf[i + 1]; },
  u32(buf, i) { return ((buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3]) >>> 0; },
  i16(buf, i) { const v = this.u16(buf, i); return v > 0x7fff ? v - 0x10000 : v; },
  i32(buf, i) { const v = this.u32(buf, i); return v > 0x7fffffff ? v - 0x100000000 : v; },
  f64(buf, i) {
    const hi = this.u32(buf, i);
    const lo = this.u32(buf, i + 4);
    const dv = new DataView(new ArrayBuffer(8));
    dv.setUint32(0, hi, false);
    dv.setUint32(4, lo, false);
    return dv.getFloat64(0, false);
  },
  text(buf, i, len) {
    let s = "";
    for (let k = 0; k < len; k++) s += String.fromCharCode(buf[i + k]);
    try { return decodeURIComponent(escape(s)); } catch (_) { return s; }
  }
};