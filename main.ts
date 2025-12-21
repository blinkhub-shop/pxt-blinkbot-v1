//% weight=990 color=#0066cc icon="\uf013" block="BlinkCore ⭐"
namespace BlinkCore {}

//% weight=980 color=#0066cc icon="\uf11b" block="BlinkEvent ⭐"
namespace BlinkEvent {
  const EVENT_ID_DARK = 3101;

  let darkWatcherStarted = false;
  let darkThresholds: number[] = [];
  let darkLastState: boolean[] = [];

  function startDarkWatcher(): void {
    if (darkWatcherStarted) return;
    darkWatcherStarted = true;

    control.inBackground(function () {
      while (true) {
        const light = input.lightLevel();

        for (let i = 0; i < darkThresholds.length; i++) {
          const th = darkThresholds[i];
          const isDark = light < th;

          if (isDark && !darkLastState[i]) {
            control.raiseEvent(EVENT_ID_DARK, th);
          }

          darkLastState[i] = isDark;
        }

        basic.pause(100);
      }
    });
  }

  //% blockId=blinkbot_on_dark
  //% block="on BlinkBot dark (ตรวจสอบความมืด) (light < %threshold)"
  //% threshold.min=0 threshold.max=255 threshold.defl=50
  //% blockAllowMultiple=1
  //% afterOnStart=true
  export function onDark(threshold: number, handler: () => void): void {
    // เก็บ threshold สำหรับ watcher
    darkThresholds.push(threshold);
    darkLastState.push(false);

    // เริ่ม watcher อัตโนมัติ (ครั้งแรกครั้งเดียว)
    startDarkWatcher();

    // register event handler
    control.onEvent(EVENT_ID_DARK, threshold, handler);
  }
}

/* namespace BlinkCore {
  const TCS34725_ADDRESS = 0x29;
  const TCS34725_COMMAND_BIT = 0x80;

  const REG_ENABLE = 0x00;
  const REG_ATIME = 0x01;
  const REG_CONTROL = 0x0f;
  const REG_CDATAL = 0x14;

  let _initialized = false;

  // เขียน 8-bit register
  function tcsWrite8(reg: number, value: number): void {
    let buf = pins.createBuffer(2);
    buf[0] = TCS34725_COMMAND_BIT | reg;
    buf[1] = value & 0xff;
    pins.i2cWriteBuffer(TCS34725_ADDRESS, buf);
  }

  // อ่าน 16-bit (LE) จาก register (Clear/Red/Green/Blue ใช้ 2 byte)
  function tcsRead16(reg: number): number {
    let buf = pins.createBuffer(1);
    buf[0] = TCS34725_COMMAND_BIT | reg;
    pins.i2cWriteBuffer(TCS34725_ADDRESS, buf);
    return pins.i2cReadNumber(TCS34725_ADDRESS, NumberFormat.UInt16LE);
  }

  function init(): void {
    if (_initialized) return;
    _initialized = true;

    // ATIME: เวลาสะสมแสง (integration time)
    // 0xEB ≈ 50ms (พอใช้ได้สำหรับหุ่น)
    tcsWrite8(REG_ATIME, 0xeb);

    // CONTROL: Gain (ขยายสัญญาณ)
    // 0x01 = 4x
    tcsWrite8(REG_CONTROL, 0x01);

    // ENABLE: Power ON + RGBC
    tcsWrite8(REG_ENABLE, 0x01); // Power ON
    basic.pause(3);
    tcsWrite8(REG_ENABLE, 0x03); // Power ON + RGBC
    basic.pause(50); // รอให้เริ่มอ่านได้จริง ๆ
  }

  // -------- RAW VALUE (ใช้ debug / คำนวนต่อเอง) --------

  //% blockId=blinkcolor_clear_raw
  //% block="TCS34725 clear (แสงรวม RAW)"
  export function clearRaw(): number {
    init();
    return tcsRead16(REG_CDATAL);
  }

  //% blockId=blinkcolor_red_raw
  //% block="TCS34725 red (แดง RAW)"
  export function redRaw(): number {
    init();
    return tcsRead16(REG_CDATAL + 2);
  }

  //% blockId=blinkcolor_green_raw
  //% block="TCS34725 green (เขียว RAW)"
  export function greenRaw(): number {
    init();
    return tcsRead16(REG_CDATAL + 4);
  }

  //% blockId=blinkcolor_blue_raw
  //% block="TCS34725 blue (น้ำเงิน RAW)"
  export function blueRaw(): number {
    init();
    return tcsRead16(REG_CDATAL + 6);
  }

  // -------- คืนเป็นชุด RGB --------

  //% blockId=blinkcolor_rgb_raw
  //% block="TCS34725 read RGB RAW"
  export function rgbRaw(): number[] {
    init();
    const r = redRaw();
    const g = greenRaw();
    const b = blueRaw();
    return [r, g, b];
  }

  // -------- แปลงเป็น 0–255 (ประมาณค่าไว้ใช้เทียบสีง่าย ๆ) --------

  function normalizeTo255(v: number, maxVal: number): number {
    if (maxVal <= 0) return 0;
    let x = (v * 255) / maxVal;
    if (x < 0) x = 0;
    if (x > 255) x = 255;
    return Math.round(x);
  }

  //% blockId=blinkcolor_red_255
  //% block="TCS34725 red (แดง 0-255)"
  export function red(): number {
    init();
    const c = clearRaw();
    const r = redRaw();
    return normalizeTo255(r, c);
  }

  //% blockId=blinkcolor_green_255
  //% block="TCS34725 green (เขียว 0-255)"
  export function green(): number {
    init();
    const c = clearRaw();
    const g = greenRaw();
    return normalizeTo255(g, c);
  }

  //% blockId=blinkcolor_blue_255
  //% block="TCS34725 blue (น้ำเงิน 0-255)"
  export function blue(): number {
    init();
    const c = clearRaw();
    const b = blueRaw();
    return normalizeTo255(b, c);
  }

  //% blockId=blinkcolor_rgb_255
  //% block="TCS34725 read RGB 0-255"
  export function rgb(): number[] {
    init();
    const c = clearRaw();
    const r = normalizeTo255(redRaw(), c);
    const g = normalizeTo255(greenRaw(), c);
    const b = normalizeTo255(blueRaw(), c);
    return [r, g, b];
  }
} */
