// Lifts the garment off its background using macOS Vision; writes a transparent PNG cropped to the garment.
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count == 3 else { print("usage: cutout <in.jpg> <out.png>"); exit(2) }
let handler = VNImageRequestHandler(url: URL(fileURLWithPath: args[1]))
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { print("no subject found: \(args[1])"); exit(1) }
let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
try CIContext().writePNGRepresentation(of: CIImage(cvPixelBuffer: buffer), to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
