namespace BlinkCore {
  //% block="set servo (หมุนเซอร์โว) |%index|degree %degree" group="Servo (เซอร์โวมอเตอร์)" group.weight=96
  //% degree.min=0 degree.max=180 degree.defl=90
  export function setServo(index: Servos, degree: number): void {
    // 50hz: 20,000 us
    let v_us = (degree * 1800) / 180 + 600; // 0.6 ~ 2.4
    let value = (v_us * 4096) / 20000;
    setPwm(index + 7, 0, value);
  }

  //% block="sweep servo (หมุนเซอร์โวสมูท) %index|degree %degree|delay %delay ms " group="Servo (เซอร์โวมอเตอร์)" group.weight=96
  //% delay.defl=25
  //% degree.min=0 degree.max=180 degree.defl=90
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

  //% block="move servos sync (หมุนเซอร์โวพร้อมกัน) in(ms) %duration S1 %s1 S2 %s2 S3 %s3 S4 %s4" group="Servo (เซอร์โวมอเตอร์)" group.weight=96
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

  //% blockId=blink_arm_rotate
  //% block="rotate arm (หมุนซ้าย-ขวา) %direction" group="Servo Auto (เซอร์โวมอเตอร์อัตโนมัติ)" group.weight=97
  //% weight=80
  export function rotateArm(direction: ArmRotateDirection): void {
    // TODO: ใส่โค้ดบังคับเซอร์โวหมุนซ้าย/ขวา
  }

  //% blockId=blink_arm_lift
  //% block="lift arm (ยกขึ้น-ลง) %direction" group="Servo Auto (เซอร์โวมอเตอร์อัตโนมัติ)" group.weight=97
  //% weight=79
  export function liftArm(direction: ArmLiftDirection): void {
    // TODO: ใส่โค้ดยก/กดแขนกล
  }

  //% blockId=blink_gripper_control
  //% block="gripper (ปล่อย-คีบ) %action" group="Servo Auto (เซอร์โวมอเตอร์อัตโนมัติ)" group.weight=97
  //% weight=78
  export function controlGripper(action: GripperAction): void {
    // TODO: ใส่โค้ดคีบ/ปล่อย
  }
}
