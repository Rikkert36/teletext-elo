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
 * The tilt and the sheen offset are derived from the index rather than random, so
 * a re-render never reshuffles the pile — the same three packets keep lying the
 * same way, which is what makes them read as objects. Same reasoning as the
 * confetti scatter in AlbumDecor.
 *
 * The colour is *not* from the index, though — it comes from the pack's id, so the
 * packet you click is the packet that tears on the opener. See `packFoil`.
 */

const TILTS = [-3.4, 2.6, -1.4, 4.1, -2.2, 1.8];

interface PackTileProps {
  pack: Pack;
  index: number;
  onOpen: (pack: Pack) => void;
}

const PackTile: React.FC<PackTileProps> = ({ pack, index, onOpen }) => {
  const vars = {
    ...packFoil(pack),
    '--tilt': `${TILTS[index % TILTS.length]}deg`,
    '--sheen-delay': `${-(index % 4) * 0.65}s`,
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
