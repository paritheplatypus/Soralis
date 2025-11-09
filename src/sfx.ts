
import { Howl } from 'howler'

const WOOSH = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAChAAAAAAAAgAAAAP//AAABAwAAAgMAAAMDAAAFBQAAAgAAAAD///8AAP//AAD///8A';
const CHIME = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAChAAAAAAAAgAAAAP//AAABAwAAAgMAAAMDAAAFBQAAAgAAAAD///8AAP//AAD///8A';

export const sfx = {
  woosh: new Howl({ src: [WOOSH], volume: 0.3 }),
  chime: new Howl({ src: [CHIME], volume: 0.35 }),
}
