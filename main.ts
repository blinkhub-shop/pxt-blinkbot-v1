//% color=#0066cc icon="\uf1fb" block="BlinkBot V1"
namespace BlinkBotV1 {
  const PCA9685_ADDRESS = 0x40;

  const PRESCALE = 0xfe;
  const LED0_ON_L = 0x06;
  const MODE1 = 0x00;

  export enum Servos {
    S1 = 0x01,
    S2 = 0x02,
    S3 = 0x03,
    S4 = 0x04,
    S5 = 0x05,
    S6 = 0x06,
    S7 = 0x07,
    S8 = 0x08,
  }
  export enum Motors {
    M1A = 0x1,
    M1B = 0x2,
    M2A = 0x3,
    M2B = 0x4,
  }
  let servoCurrentPos: { [key: string]: number } = {
    S1: 90,
    S2: 90,
    S3: 90,
    S4: 90,
    S5: 90,
    S6: 90,
    S7: 90,
    S8: 90,
  };

  //% block="initialize PCA9685"
  export function initPCA9685(): void {
    i2cwrite(0x40, 0x00, 0x00);
    setFreq(50);
    for (let idx = 0; idx < 16; idx++) {
      setPwm(idx, 0, 0);
    }

    for (let i = 1; i <= 8; i++) {
      const s = i as Servos;
      const value = servoCurrentPos["S" + i];
      if (value !== undefined) setServo(s, value);
    }
  }

  function i2cwrite(addr: number, reg: number, value: number) {
    let buf = pins.createBuffer(2);
    buf[0] = reg;
    buf[1] = value;
    pins.i2cWriteBuffer(addr, buf);
  }

  function setFreq(freq: number): void {
    // Constrain the frequency
    let prescaleval = 25000000;
    prescaleval /= 4096;
    prescaleval /= freq;
    prescaleval -= 1;
    let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
    let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
    let newmode = (oldmode & 0x7f) | 0x10; // sleep
    i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
    i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
    i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
    control.waitMicros(5000);
    i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
  }

  function setPwm(channel: number, on: number, off: number): void {
    if (channel < 0 || channel > 15) return;
    let buf = pins.createBuffer(5);
    buf[0] = LED0_ON_L + 4 * channel;
    buf[1] = on & 0xff;
    buf[2] = (on >> 8) & 0xff;
    buf[3] = off & 0xff;
    buf[4] = (off >> 8) & 0xff;
    pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
  }

  function i2cread(addr: number, reg: number) {
    pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
    let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    return val;
  }

  //% block="set servo |%index|degree %degree"
  export function setServo(index: Servos, degree: number): void {
    // 50hz: 20,000 us
    let v_us = (degree * 1800) / 180 + 600; // 0.6 ~ 2.4
    let value = (v_us * 4096) / 20000;
    setPwm(index + 7, 0, value);
  }

  //% block="sweep servo %index|degree %degree|delay %delay ms"
  //% delay.defl=10
  export function sweepServo(
    index: Servos,
    degree: number,
    delay: number
  ): void {
    const servoNumber = "S" + index;
    while (servoCurrentPos[servoNumber] !== degree) {
      if (servoCurrentPos[servoNumber] > degree) {
        servoCurrentPos[servoNumber]--;
      } else if (servoCurrentPos[servoNumber] < degree) {
        servoCurrentPos[servoNumber]++;
      }
      setServo(index, servoCurrentPos[servoNumber]);
      basic.pause(delay);
    }
  }

  //% block="motor run|%index|speed %speed"
  export function motorRun(index: Motors, speed: number): void {
    speed = speed * 16; // map 255 to 4096
    if (speed >= 4096) {
      speed = 4095;
    }
    if (speed <= -4096) {
      speed = -4095;
    }
    if (index > 4 || index <= 0) return;
    let pp = (index - 1) * 2;
    let pn = (index - 1) * 2 + 1;
    if (speed >= 0) {
      setPwm(pp, 0, speed);
      setPwm(pn, 0, 0);
    } else {
      setPwm(pp, 0, 0);
      setPwm(pn, 0, -speed);
    }
  }
}
