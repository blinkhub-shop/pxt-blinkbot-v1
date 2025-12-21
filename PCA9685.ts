namespace BlinkCore {
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

  export let servoCurrentPos: { [key: string]: number } = {
    S1: 90,
    S2: 90,
    S3: 90,
    S4: 90,
    S5: 90,
    S6: 90,
    S7: 90,
    S8: 90,
  };

  //% block="initialize (เริ่มใช่งานโมดูล)" group="Setup (ตั้งค่า)" group.weight=100
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

  function setFreq(freq: number): void {
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

  export function setPwm(channel: number, on: number, off: number): void {
    if (channel < 0 || channel > 15) return;
    let buf = pins.createBuffer(5);
    buf[0] = LED0_ON_L + 4 * channel;
    buf[1] = on & 0xff;
    buf[2] = (on >> 8) & 0xff;
    buf[3] = off & 0xff;
    buf[4] = (off >> 8) & 0xff;
    pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
  }
}
