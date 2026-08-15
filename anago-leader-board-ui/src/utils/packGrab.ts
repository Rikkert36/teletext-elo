/**
 * Where a packet was lying when you reached for it, in viewport pixels.
 *
 * The pile and the stage are two different components with two different sizes — a
 * packet on the shelf is exactly a card wide (`--album-card-w`), the one on the stage
 * is `--pack-w`, half again as big — and until now the swap between them was a cut: the
 * tile vanished out of the margin and a bigger packet appeared in the middle on the same
 * frame. This is the handful of numbers that lets the second one be flown from where the
 * first one was, so the packet you clicked is the packet that arrives.
 *
 * It travels **tile → CollectionPage → PackOpener**, because the two ends of the flight
 * are owned by different components and neither can see the other: the shelf is an aside
 * in the margin, the stage is inside the opener that has not mounted yet.
 */
export interface PackGrab {
  /** The tile's centre. */
  cx: number;
  cy: number;
  /**
   * The tile's own width — `offsetWidth`, **not** the bounding box's.
   *
   * A packet on the shelf leans up to 4.1°, and a rotated element's bounding box is the
   * axis-aligned box *around* the lean: at that angle a packet is ~1.7× as tall as it is
   * wide, so the box comes out some 14% wider than the packet. Scaling by that would set
   * the flight off visibly too big and land it a fraction short.
   */
  w: number;
  /**
   * And its height, for the same reason and by the same measurement.
   *
   * Only the return journey needs it — a packet put back down is drawn from scratch as a
   * clone in viewport space, and a box needs two numbers. The way *in* animates an element
   * the layout has already sized, so there it would be a fact nobody reads. It is recorded
   * on both because a grab is a description of a packet, and half a description is the
   * kind of thing that gets re-derived from `--pack-h`'s formula in a third place.
   */
  h: number;
  /** How far it was lying over, in degrees, so the flight can straighten it out. */
  tilt: number;
}

/**
 * Measures a tile, at the moment it is clicked.
 *
 * The **centre** comes off the bounding box and the **width** off the layout box, which
 * is not an inconsistency: `rotate()` and `scale()` are about the element's centre, so
 * the box's centre is the packet's centre whatever it is doing, while its width is not
 * the packet's width. That also means a packet caught mid-hover — lifted 4px and 4%
 * larger — is measured where the reader can see it rather than where it would be lying
 * if their pointer were somewhere else.
 */
export const grabPack = (el: HTMLElement, tilt: number): PackGrab => {
  const box = el.getBoundingClientRect();

  return {
    cx: box.left + box.width / 2,
    cy: box.top + box.height / 2,
    w: el.offsetWidth,
    h: el.offsetHeight,
    tilt,
  };
};
