# 皮肤素材

- **坚果**：`cats.png`，初版的蓝眼睛猫咪透明图。
- **元宵原图**：`cats2.png`，用户提供的绿眼睛猫咪设计，保留不变。
- **元宵游戏素材**：`cats2-transparent.png`，使用内置 imagegen 去除背景与字母；1536 × 1024 RGBA。处理提示词如下。

```text
Use case: background-extraction
Asset type: transparent sprite atlas for a cat Tetris game.
Input image is the EDIT TARGET. Preserve exactly the seven existing white cats with green eyes (same cat Yuanxiao), every facial feature, fur detail, expression, pose, size and position on the same 1536x1024 canvas. Change ONLY the background and the seven letter labels: remove the entire light-blue background to real alpha transparency and remove I O T S Z J L. Carefully keep complete ears, fur silhouette and whiskers, including wisps beyond body outlines. Keep all seven cats separate in exactly their existing locations, long cat top left, curled square cat top middle, T cat top right, S Z J L cats along bottom. Do not redesign, rescale, reposition, omit or add cats. No other changes. No text, no backdrop, no checkerboard pixels, no added shadows. Actual transparent background.
```

游戏内的裁切与旋转由 `skins.js` 完成。猫咪连续绘制，允许小范围毛发与耳朵超出网格；每个纹理像素归属于最近的实际占用格，消行时随对应格一起移除。碰撞仍由 `engine.js` 的四格形状决定。
