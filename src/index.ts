import { AptitudeTrainingElement } from "./element/AptitudeTrainingElement"

export { AptitudeTrainingElement }

if (!customElements.get("aptitude-training")) {
  customElements.define("aptitude-training", AptitudeTrainingElement)
}
