const target = document.getElementById("results");
function check(label, passed) { const line = document.createElement("p"); line.className = passed ? "pass" : "fail"; line.textContent = `${passed ? "PASS" : "FAIL"} — ${label}`; target.append(line); }
const input = { imageWidth: 2800, imageHeight: 1280, viewportWidth: 960, viewportHeight: 540, focusBoxes: [{ x: 500, y: 250, width: 250, height: 100 }, { x: 1000, y: 400, width: 160, height: 120 }] };
const view = HF.computeCameraViewBox(input);
check("all focus boxes fit inside the camera view", input.focusBoxes.every((box) => box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height));
check("18% padding surrounds the focus union", view.width + 1e-6 >= (1160 - 500) * 1.36 && view.height + 1e-6 >= (520 - 250) * 1.36);
check("minimum visible width is 30% of the image", HF.computeCameraViewBox({ ...input, focusBoxes: [{ x: 900, y: 500, width: 5, height: 5 }] }).width >= 840);
check("focus wider than 70% uses overview", HF.computeCameraViewBox({ ...input, focusBoxes: [{ x: 100, y: 100, width: 2100, height: 300 }] }).overview);
check("camera remains inside image bounds", view.x >= 0 && view.y >= 0 && view.x + view.width <= 2800 && view.y + view.height <= 1280);
check("camera preserves viewport aspect ratio", Math.abs(view.width / view.height - 960 / 540) < 1e-9);
check("empty focus uses overview", HF.computeCameraViewBox({ ...input, focusBoxes: [] }).overview);

const popup = HF.computeCameraViewBox({ ...input, popupSide: 'right' });
check("popup reservation adds room on the right", popup.width >= view.width && popup.x + popup.width >= view.x + view.width);
const labels = [{ x: 600, y: 180, width: 100, height: 35 }];
const withLabels = HF.computeCameraViewBox({ ...input, focusBoxes: [...input.focusBoxes, ...labels] });
check("focus label area fits", labels.every((box) => box.x >= withLabels.x && box.y >= withLabels.y && box.x + box.width <= withLabels.x + withLabels.width && box.y + box.height <= withLabels.y + withLabels.height));
