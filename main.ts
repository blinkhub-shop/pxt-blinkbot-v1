//% color=#0066cc icon="\uf013" block="BlinkCore ⭐"
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

  //% block="initialize PCA9685 (เริ่มใช่งานโมดูล)"
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

  //% block="set servo (หมุนเซอร์โว) |%index|degree %degree"
  export function setServo(index: Servos, degree: number): void {
    // 50hz: 20,000 us
    let v_us = (degree * 1800) / 180 + 600; // 0.6 ~ 2.4
    let value = (v_us * 4096) / 20000;
    setPwm(index + 7, 0, value);
  }

  //% block="sweep servo (หมุนเซอร์โวสมูท) %index|degree %degree|delay %delay ms"
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

  //% block="move servos sync (หมุนเซอร์โวพร้อมกัน) in(ms) %duration S1 %s1 S2 %s2 S3 %s3 S4 %s4"
  //% duration.defl=1000
  //% s1.min=0 s1.max=180 s1.defl=90
  //% s2.min=0 s2.max=180 s2.defl=90
  //% s3.min=0 s3.max=180 s3.defl=90
  //% s4.min=0 s4.max=180 s4.defl=90
  export function moveServosSync(
    duration: number,
    s1: number,
    s2: number,
    s3: number,
    s4: number
  ): void {
    // targets[1..8] = เป้าหมายของ S1..S8
    let targets: number[] = [0, s1, s2, s3, s4];
    let starts: number[] = [];
    let deltas: number[] = [];
    let maxDist = 0;

    // เตรียมค่าเริ่มต้น + delta + หา maxDist
    for (let i = 1; i <= 8; i++) {
      // กันค่าหลุด 0–180
      if (targets[i] < 0) targets[i] = 0;
      if (targets[i] > 180) targets[i] = 180;

      const key = "S" + i;
      let start = servoCurrentPos[key];
      if (start === undefined) start = 90; // fallback ถ้าไม่มีใน map

      starts[i] = start;
      const d = targets[i] - start;
      deltas[i] = d;

      const absd = Math.abs(d);
      if (absd > maxDist) maxDist = absd;
    }

    // ถ้าไม่มีใครต้องขยับ หรือ duration <= 0 → snap ทันที
    if (maxDist == 0 || duration <= 0) {
      for (let i = 1; i <= 8; i++) {
        const angle = targets[i];
        const servo = i as Servos;
        setServo(servo, angle);
        servoCurrentPos["S" + i] = angle;
      }
      return;
    }

    // จำนวน step = ระยะไกลสุด (องศา)
    let steps = maxDist;
    if (steps < 1) steps = 1;

    // เวลา pause ต่อ 1 step
    let frameDelay = Math.floor(duration / steps);
    if (frameDelay < 1) frameDelay = 1;

    // current + increment ต่อ step
    let current: number[] = [];
    let inc: number[] = [];
    for (let i = 1; i <= 8; i++) {
      current[i] = starts[i];
      inc[i] = deltas[i] / steps; // ใช้ float ทำ interpolation
    }

    // main loop: ขยับทุกตัวพร้อมกันทีละ step
    for (let step = 0; step < steps; step++) {
      for (let i = 1; i <= 8; i++) {
        if (deltas[i] != 0) {
          current[i] += inc[i];
          const angle = Math.round(current[i]);
          const servo = i as Servos;
          setServo(servo, angle);
          servoCurrentPos["S" + i] = angle;
        }
      }
      basic.pause(frameDelay);
    }

    // เก็บท้ายอีกทีให้ตรง target เป๊ะ
    for (let i = 1; i <= 8; i++) {
      const angle = targets[i];
      const servo = i as Servos;
      setServo(servo, angle);
      servoCurrentPos["S" + i] = angle;
    }
  }

  //% block="motor run (มอเตอร์ทำงาน)|%index|speed %speed"
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

  //% blockId=blinkbot_line_follow_step
  //% block="line follow (เดินตามเส้น) |max speed %maxSpeed|left sensor %leftPin|right sensor %rightPin"
  //% maxSpeed.min=0 maxSpeed.max=255 maxSpeed.defl=150
  //% weight=70
  export function lineFollowStep(
    maxSpeed: number,
    leftPin: DigitalPin,
    rightPin: DigitalPin
  ): void {
    // กันค่า speed หลุด
    if (maxSpeed < 0) maxSpeed = 0;
    if (maxSpeed > 255) maxSpeed = 255;

    // ความเร็วเวลาหักเลี้ยว (ลดฝั่งหนึ่งลงเหลือประมาณ 30%)
    const slowSpeed = Math.floor((maxSpeed * 3) / 10);

    // อ่านค่า sensor ดิจิทัล
    const left = pins.digitalReadPin(leftPin);
    const right = pins.digitalReadPin(rightPin);

    // *** สมมติ: 0 = เจอเส้นดำ, 1 = ไม่เจอเส้น ***
    const ON_LINE = 0;

    if (left == ON_LINE && right == ON_LINE) {
      // อยู่บนเส้นทั้งสอง → วิ่งตรง
      motorRun(Motors.M1A, maxSpeed); // ซ้าย
      motorRun(Motors.M2A, maxSpeed); // ขวา
    } else if (left == ON_LINE && right != ON_LINE) {
      // เส้นอยู่ด้านซ้าย → เลี้ยวซ้าย (ลดสปีดล้อซ้าย)
      motorRun(Motors.M1A, slowSpeed);
      motorRun(Motors.M2A, maxSpeed);
    } else if (right == ON_LINE && left != ON_LINE) {
      // เส้นอยู่ด้านขวา → เลี้ยวขวา (ลดสปีดล้อขวา)
      motorRun(Motors.M1A, maxSpeed);
      motorRun(Motors.M2A, slowSpeed);
    } else {
      // หาเส้นไม่เจอทั้งสองข้าง → หยุด (หรือจะให้วิ่งต่อก็แล้วแต่)
      motorRun(Motors.M1A, 0);
      motorRun(Motors.M2A, 0);
    }
  }

  // -------- ENUMS สำหรับ dropdown --------

  // หมุนซ้าย/ขวา
  export enum ArmRotateDirection {
    //% block="left"
    Left = 0,
    //% block="right"
    Right = 1,
  }

  // ยกขึ้น/ลง
  export enum ArmLiftDirection {
    //% block="up"
    Up = 0,
    //% block="down"
    Down = 1,
  }

  // คีบ / ปล่อย
  export enum GripperAction {
    //% block="grip"
    Grip = 0,
    //% block="release"
    Release = 1,
  }

  // -------- BLOCK 1: หมุนซ้ายขวา --------
  //% blockId=blink_arm_rotate
  //% block="rotate arm %direction"
  //% weight=80
  export function rotateArm(direction: ArmRotateDirection): void {
    // TODO: ใส่โค้ดบังคับเซอร์โวหมุนซ้าย/ขวา
  }

  // -------- BLOCK 2: ยกขึ้นลง --------
  //% blockId=blink_arm_lift
  //% block="lift arm %direction"
  //% weight=79
  export function liftArm(direction: ArmLiftDirection): void {
    // TODO: ใส่โค้ดยก/กดแขนกล
  }

  // -------- BLOCK 3: คีบ / ปล่อย --------
  //% blockId=blink_gripper_control
  //% block="gripper %action"
  //% weight=78
  export function controlGripper(action: GripperAction): void {
    // TODO: ใส่โค้ดคีบ/ปล่อย
  }
}

//% color=#0066cc icon="\uf11b" block="BlinkEvent ⭐"
namespace BlinkEvent {
  // กำหนด Event ID (ต้องไม่ซ้ำกับของระบบ)
  const EVENT_ID = 3100;

  // ค่าที่ใช้แทนสี
  export enum ColorEnum {
    //% block="red"
    Red = 1,
    //% block="green"
    Green = 2,
    //% block="blue"
    Blue = 3,
  }

  // สร้าง BLOCK สำหรับ Event
  //% block="on color detected(ตรวจสอบสี) %color"
  //% color.shadow="colorenum"
  export function onColorDetected(color: ColorEnum, handler: () => void) {
    // เริ่ม loop monitoring อัตโนมัติ (ครั้งแรกครั้งเดียว)
    startColorMonitoring();
    // สมัคร handler กับ Event system
    control.onEvent(EVENT_ID, color, handler);
  }

  /**
   * ฟังก์ชันยิง event (ไว้เรียกจาก loop ภายใน extension)
   * ตัวนี้จะไม่เป็น block เพื่อไม่ให้ผู้ใช้เรียกเอง
   */
  function raiseColorEvent(color: ColorEnum) {
    control.raiseEvent(EVENT_ID, color);
  }

  /**
   * ตัวอย่างจำลองการตรวจจับสี
   * ในเวอร์ชันจริงคุณจะเขียนฟังก์ชัน readColor() ให้คืนค่า RGB จริง
   */
  function detectColor(): ColorEnum {
    let r = Math.random() * 255;
    let g = Math.random() * 255;
    let b = Math.random() * 255;

    r = Math.floor(r);
    g = Math.floor(g);
    b = Math.floor(b);

    if (r > g && r > b) return ColorEnum.Red;
    if (g > r && g > b) return ColorEnum.Green;
    return ColorEnum.Blue;
  }

  /**
   * Loop ตรวจสีตลอดเวลา + ยิง event เมื่อมีการเปลี่ยนสี
   */
  let lastColor = 0;
  let monitoringStarted = false;

  function startColorMonitoring() {
    if (monitoringStarted) return;
    monitoringStarted = true;

    control.inBackground(function () {
      while (true) {
        let current = detectColor();

        // ถ้าสีเปลี่ยน → ยิง event
        if (current != lastColor) {
          raiseColorEvent(current);
          lastColor = current;
        }

        basic.pause(200);
      }
    });
  }

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
