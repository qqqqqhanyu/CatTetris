# 皮肤素材

- **坚果原图**：`cats.png`，用户更新的蓝眼睛猫咪设计。
- **元宵原图**：`cats2.png`，用户更新的绿眼睛猫咪设计。
- **游戏素材**：`cats-transparent.png` 与 `cats2-transparent.png`，使用内置 imagegen 分别去除背景与字母；均为 1536 × 1024 RGBA。

两只猫均保留新 T 字造型：尾巴在上、爪子向两侧伸展、头朝下。原始设计不覆盖为处理图。

两张图使用相同的处理提示词，各自以对应原图为唯一编辑目标：

```text
Use case: background-extraction
Asset type: transparent sprite atlas for a cat Tetris game.
Input image is the EDIT TARGET. Remove ONLY the light blue background and the seven letter labels I O T S Z J L. Output real alpha transparency on the same 1536x1024 canvas. Preserve all seven cats exactly: same colors, eyes, facial features, fur, silhouette, size, orientation, and position. Especially preserve the NEW upside-down T-shaped cat at the upper right: tail at the top, paws spread sideways and head pointing down; do NOT flip it or replace it with the old upright face. Keep complete ears and whiskers. No redesign, no rescaling, no repositioning, no missing cats, no new shadows. Keep cat interiors opaque white/cream. No background, no text, no checkerboard pixels. Actual transparent background.
```

游戏内由 `skins.js` 按透明通道收紧各个造型的取图范围，再适当放大以减少方格留白。猫咪连续绘制，允许小范围毛发、尾巴与耳朵超出网格；每个纹理像素归属于最近的实际占用格，消行时随对应格一起移除。碰撞仍由 `engine.js` 的四格形状决定。
