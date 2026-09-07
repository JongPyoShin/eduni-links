import { DRACOLoader as ThreeDRACOLoader } from "three/addons-local/loaders/DRACOLoader.js";

export const LOCAL_DRACO_DECODER_PATH = "./node_modules/three/examples/jsm/libs/draco/";

// Existing renderers already call setDecoderPath(). Keep that contract but
// force the decoder to the project-local Three.js package so PC/tablet runs do
// not depend on gstatic or any other external CDN.
export class DRACOLoader extends ThreeDRACOLoader {
  setDecoderPath(_path) {
    return super.setDecoderPath(LOCAL_DRACO_DECODER_PATH);
  }
}
