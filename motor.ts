namespace BlinkCore {
  //% block="motor run (มอเตอร์ทำงาน)|%index|speed %speed" group="Motor (มอเตอร์)" group.weight=98
  //% speed.min=-255 speed.max=255
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
  //% block="line follow (เดินตามเส้น) |max speed %maxSpeed|left sensor %leftPin|right sensor %rightPin" group="Motor Auto (มอเตอร์อัตโนมัติ)" group.weight=99
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
    // const slowSpeed = Math.floor((maxSpeed * 3) / 10);
    const slowSpeed = 0;

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
}
