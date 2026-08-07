export interface ContainedImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface SourceImagePoint {
  x: number;
  y: number;
}

const validDimension = (value: number) => Number.isFinite(value) && value > 0;

/**
 * Rzeczywisty prostokąt obrazu wyświetlanego przez `object-fit: contain`.
 *
 * Element `<img>` może wypełniać całe pole, chociaż sam obraz zajmuje tylko
 * jego wyśrodkowaną część. Te puste marginesy trzeba odjąć przy mapowaniu
 * kursora na piksele pliku źródłowego.
 */
export function containedImageRect(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ContainedImageRect | null {
  if (
    !validDimension(containerWidth) ||
    !validDimension(containerHeight) ||
    !validDimension(imageWidth) ||
    !validDimension(imageHeight)
  ) {
    return null;
  }

  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
    scale,
  };
}

/** Mapuje punkt w elemencie `<img>` na piksel obrazu źródłowego. */
export function sourcePointInContainedImage(
  pointX: number,
  pointY: number,
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): SourceImagePoint | null {
  const image = containedImageRect(containerWidth, containerHeight, imageWidth, imageHeight);
  if (!image) return null;

  if (
    pointX < image.x ||
    pointY < image.y ||
    pointX > image.x + image.width ||
    pointY > image.y + image.height
  ) {
    return null;
  }

  return {
    x: Math.min(imageWidth, Math.max(0, (pointX - image.x) / image.scale)),
    y: Math.min(imageHeight, Math.max(0, (pointY - image.y) / image.scale)),
  };
}
