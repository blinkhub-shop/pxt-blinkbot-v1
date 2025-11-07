//% color=#0066cc icon="\uf1fb" block="BlinkBot V1"
namespace BlinkBotV1 {
  export enum DetectedColor {
    //% block="None"
    None = 0,
    //% block="Red"
    Red = 1,
    //% block="Green"
    Green = 2,
    //% block="Blue"
    Blue = 3,
    //% block="Yellow"
    Yellow = 4,
  }

  let lastColor = 0
  let watching = false

  const TCS34725_ADDRESS = 0x29
  const COMMAND_BIT = 0x80

  function tcsWriteRegister(reg: number, value: number) {
      pins.i2cWriteNumber(TCS34725_ADDRESS, COMMAND_BIT | reg, NumberFormat.UInt8BE)
      pins.i2cWriteNumber(TCS34725_ADDRESS, value, NumberFormat.UInt8BE)
  }

  function tcsRead16(reg: number): number {
      pins.i2cWriteNumber(TCS34725_ADDRESS, COMMAND_BIT | reg, NumberFormat.UInt8BE)
      return pins.i2cReadNumber(TCS34725_ADDRESS, NumberFormat.UInt16LE)
  }

  //% block="initialize color sensor"
  export function initSensor() {
      tcsWriteRegister(0x00, 0x01)
      basic.pause(3)
      tcsWriteRegister(0x00, 0x03)
      tcsWriteRegister(0x01, 0xFF)
      tcsWriteRegister(0x0F, 0x00)
      basic.pause(700)
  }

  function readRGB(): number[] {
      const clear = tcsRead16(0x14)
      const red = tcsRead16(0x16)
      const green = tcsRead16(0x18)
      const blue = tcsRead16(0x1A)
      const scale = 255 / Math.max(1, clear)
      const r = Math.min(255, Math.idiv(red * scale, 1))
      const g = Math.min(255, Math.idiv(green * scale, 1))
      const b = Math.min(255, Math.idiv(blue * scale, 1))
      return [r, g, b]
  }

  function rgbToColor(r: number, g: number, b: number): DetectedColor {
      if (r > 180 && g < 100 && b < 100) return DetectedColor.Red
      if (g > 180 && r < 100 && b < 100) return DetectedColor.Green
      if (b > 180 && r < 100 && g < 100) return DetectedColor.Blue
      if (r > 150 && g > 150 && b < 80) return DetectedColor.Yellow
      return DetectedColor.None
  }

  //% block="when color detected %color"
  export function onColorDetected(color: DetectedColor, handler: () => void) {
      control.inBackground(() => {
          if (!watching) {
              watching = true
              while (true) {
                  const rgb = readRGB()
                  const detected = rgbToColor(rgb[0], rgb[1], rgb[2])
                  if (detected == color && detected != lastColor) {
                      lastColor = detected
                      handler()
                  }
                  basic.pause(200)
              }
          }
      })
  }

  //% block="read color value"
  export function readColor(): number {
      const rgb = readRGB()
      const c = rgbToColor(rgb[0], rgb[1], rgb[2])
      return c
  }
}
