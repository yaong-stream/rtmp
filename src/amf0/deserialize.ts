export class AMF0Deserialize {
  private offset: number = 0;
  private buffer: Buffer = Buffer.alloc(0);
  private references: any[] = [];

  public parse(buffer: Buffer) {
    this.buffer = buffer;
    const result: any[] = [];
    while (this.buffer.length > this.offset) {
      const type = this.readType();
      const value = this.readValue(type);
      if (type !== AMF0DataType.UNDEFINED_MARKER && value !== undefined) {
        // object end marker 가 마지막에 있는 경우 undefined 뜸.
        result.push(value);
      }
    }
    this.buffer = Buffer.alloc(0);
    this.offset = 0;
    return result;
  }

  private readValue(type: AMF0DataType) {
    switch (type) {
      case AMF0DataType.NUMBER_MARKER: {
        return this.readNumber();
      }
      case AMF0DataType.BOOLEAN_MARKER: {
        return this.readBoolean();
      }
      case AMF0DataType.STRING_MARKER: {
        return this.readString();
      }
      case AMF0DataType.OBJECT_MARKER: {
        return this.readObject();
      }
      case AMF0DataType.MOVIECLIP_MARKER: {
        console.info("Deprecated Method");
        break;
      }
      case AMF0DataType.NULL_MARKER: {
        return this.readNull();
      }
      case AMF0DataType.UNDEFINED_MARKER: {
        return this.readUndefined();
      }
      case AMF0DataType.REFERENCE_MARKER: {
        return this.readRefference();
      }
      case AMF0DataType.ECMA_ARRAY_MARKER: {
        return this.readECMAArray();
      }
      case AMF0DataType.STRICT_ARRAY_MARKER: {
        return this.readStrictArray();
      }
      case AMF0DataType.DATE_MARKER: {
        return this.readDate();
      }
      case AMF0DataType.LONG_STRING_MARKER: {
        return this.readLongString();
      }
      case AMF0DataType.UNSUPPORT_MARKER: {
        console.info("Unsupport marker");
        break;
      }
      case AMF0DataType.RECOREDSET_MARKER: {
        return this.readRecordSet();
      }
      case AMF0DataType.XML_DOCUMENT_MARKER: {
        return this.readXMLDocument();
      }
      case AMF0DataType.TYPED_OBJECT_MARKER: {
        return this.readTypedObject();
      }
      case AMF0DataType.AVMPLUS_OBJECT_MARKER: {
        break;
      }
    }
  }

  private readTypedObject() {
    const classname = this.readString();
    const obj: any = {};
    while (this.offset < this.buffer.length) {
      const key = this.readString();
      const type = this.readType();
      if (type === AMF0DataType.OBJECT_END_MARKER) {
        break;
      }
      obj[key] = this.readValue(type);
    }
    this.references.push({ classname, obj });
    return { classname, obj };
  }

  private readXMLDocument() {
    const length = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    const xml = this.buffer.toString("utf8", this.offset, this.offset + length);
    this.offset += length;
    return xml;
  }

  private readRecordSet() {
    const count = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    const records: any[] = [];
    for (let i = 0; i < count; i++) {
      const record = this.readObject();
      record.push(record);
    }
    return records;
  }

  private readLongString(): string {
    const length = this.buffer.readUint32BE(this.offset);
    this.offset += 4;
    const data = this.buffer.toString("utf8", this.offset, this.offset + length);
    this.offset += length;
    return data;
  }

  private readDate(): Date {
    const milliseconds = this.buffer.readDoubleBE(this.offset);
    this.offset += 8;
    const timezoneOffset = this.buffer.readInt16BE(this.offset);
    this.offset += 2;
    return new Date(milliseconds);
  }

  private readStrictArray() {
    const length = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    const array: any[] = [];
    for (let i = 0; i < length; i++) {
      const type = this.readType();
      array.push(this.readValue(type));
    }
    this.references.push(array);
    return array;
  }

  private readECMAArray() {
    const obj: any = {};
    const length = this.buffer.readUint32BE(this.offset);
    this.offset += 4;
    for (let i = 0; i < length; i++) {
      const key = this.readString();
      const type = this.readType();
      if (type === AMF0DataType.OBJECT_END_MARKER) {
        break;
      }
      obj[key] = this.readValue(type);
    }
    this.references.push(obj);
    return obj;
  }

  private readRefference() {
    const index = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    return this.references[index];
  }

  private readUndefined(): undefined {
    console.log("called")
    return undefined;
  }

  private readNull(): null {
    return null;
  }

  private readObject() {
    const obj: any = {};
    while (this.offset < this.buffer.length) {
      const key = this.readString();
      const type = this.readType();
      if (type === AMF0DataType.OBJECT_END_MARKER) {
        break;
      }
      obj[key] = this.readValue(type);
    }
    this.references.push(obj);
    return obj;
  }

  private readString(): string {
    const length = this.buffer.readUint16BE(this.offset);
    this.offset += 2;
    const data = this.buffer.toString("utf8", this.offset, this.offset + length);
    this.offset += length;
    return data;
  }

  private readBoolean(): boolean {
    const data = this.buffer.readUint8();
    this.offset += 1;
    return data === 1;
  }

  private readNumber(): number {
    const data = this.buffer.readDoubleBE(this.offset);
    this.offset += 8;
    return data;
  }

  private readType(): AMF0DataType {
    return this.buffer.readUint8(this.offset++);
  }
}

export enum AMF0DataType {
  NUMBER_MARKER = 0x00,
  BOOLEAN_MARKER = 0x01,
  STRING_MARKER = 0x02,
  OBJECT_MARKER = 0x03,
  MOVIECLIP_MARKER = 0x04, // 예약됨, 미지원
  NULL_MARKER = 0x05,
  UNDEFINED_MARKER = 0x06,
  REFERENCE_MARKER = 0x07,
  ECMA_ARRAY_MARKER = 0x08,
  OBJECT_END_MARKER = 0x09,
  STRICT_ARRAY_MARKER = 0x0a,
  DATE_MARKER = 0x0b,
  LONG_STRING_MARKER = 0x0c,
  UNSUPPORT_MARKER = 0x0d,
  RECOREDSET_MARKER = 0x0e, // 예약됨, 미지원
  XML_DOCUMENT_MARKER = 0x0F,
  TYPED_OBJECT_MARKER = 0x10,
  AVMPLUS_OBJECT_MARKER = 0x11,
}
