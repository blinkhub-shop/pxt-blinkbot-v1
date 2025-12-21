function i2cwrite(addr: number, reg: number, value: number) {
  let buf = pins.createBuffer(2);
  buf[0] = reg;
  buf[1] = value;
  pins.i2cWriteBuffer(addr, buf);
}

function i2cread(addr: number, reg: number) {
  pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
  let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
  return val;
}
