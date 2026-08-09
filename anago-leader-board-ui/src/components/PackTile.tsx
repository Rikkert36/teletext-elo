import React from 'react';
import { Pack } from '../mock/cardMock';
import { packFoil } from '../utils/packFoil';
import PackFace from './PackFace';
import '../styles/packopen.css';

/**
 * One unopened packet on the shelf beside the album.
 *
 * Deliberately the same `.pack` element the opener tears apart, at `--pack-w`
 * quarter size — see the `.pack--mini` block in packopen.css for why rendering
 * the actual packet beats a button that describes one.
 *
 * The tilt and the sheen offset are derived from the pack's **id** rather than
 * random, so a re-render never reshuffles the pile — the same three packets keep
 * lying the same way, which is what makes them read as objects.
 *
 * It used to be the array index, which was stable only for as long as the shelf
 * outlived nothing: the opener now runs *beside* the pile rather than replacing it,
 * so a packet leaves the middle of the list while the rest stay on screen. Every
 * packet below it would have inherited its neighbour's tilt and visibly settled into
 * a new position — the pile rearranging itself because one was picked up. Lying
 * still is a property of the packet, so it has to key off the packet.
 *
 * The colour comes from the pack's *type*, not its id or its place — see `packFoil`.
 */

const TILTS = [-3.4, 2.6, -1.4, 4.1, -2.2, 1.8];

/** Cheap stable string hash. Only has to be well spread, not well distributed. */
const hash = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};

interface PackTileProps {
  pack: Pack;
  onOpen: (pack: Pack) => void;
}

const PackTile: React.FC<PackTileProps> = ({ pack, onOpen }) => {
  const seed = hash(pack.id);
  const vars = {
    ...packFoil(pack),
    '--tilt': `${TILTS[seed % TILTS.length]}deg`,
    '--sheen-delay': `${-(seed % 4) * 0.65}s`,
  } as React.CSSProperties;

  return (
    <button
      type="button"
      className="pack pack--mini"
      style={vars}
      onClick={() => onOpen(pack)}
      title={pack.reason}
      aria-label={`Pakje openen — ${pack.size} ${
        pack.size === 1 ? 'kaart' : 'kaarten'
      }, ${pack.reason}`}
    >
      <PackFace pack={pack} />
    </button>
  );
};

export default PackTile;
