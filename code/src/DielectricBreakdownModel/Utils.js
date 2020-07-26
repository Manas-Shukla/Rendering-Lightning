import GLBL from './Globals';

// calc distance b/w two points(3D)
export function distance(p1, p2) {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2)
}

// src : https://gist.github.com/brannondorsey/dc4cfe00d6b124aebd3277159dcbdb14
// sample from probability
export function getSampleIndex(probs) {
    const sum = probs.reduce((a, b) => a + b, 0)
    if (sum <= 0) throw Error('probs must sum to a value greater than zero')
    const normalized = probs.map(prob => prob / sum)
    const sample = Math.random()
    let total = 0
    for (let i = 0; i < normalized.length; i++) {
        total += normalized[i]
        if (sample < total) return i
    }
}

export function potFuncForUnitCenteredCharge(pos, rad) {
    return (p) => {
        let r = distance(p, pos)
        return 1 - rad / r;
    }
}

export function potFuncForPlaneCharge(pos, rad,outrad) {
    return (p) => {

        const r = distance(pos, p);
        // return (1 - this.R / r);
        const c = [-1 / 5, 1, -21 / 10, 1];
        var pot = 0;
        const dif = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]];
        const nrm = distance(dif, [0, 0, 0]);
        const theta = Math.acos(dif[1] / nrm);
        for (let l = 0; l < 4; l++) {
            const al = c[l] * (1 / (Math.pow(outrad, l) - Math.pow(rad, 2 * l + 1) / Math.pow(outrad, l + 1)));
            const bl = -1 * Math.pow(rad, 2 * l + 1) * al;
            const scale = -1 * (al * Math.pow(r, l) + bl * 1 / Math.pow(r, l + 1));
            if (l == 0) {
                pot += scale;
            }
            else if (l == 1) {
                const x = Math.cos(theta);
                pot += scale * x;
            }
            else if (l == 2) {
                const x = Math.cos(theta);
                pot += scale * 1 / 2 * (3 * x * x - 1);
            }
            else if (l == 3) {
                const x = Math.cos(theta);
                pot += scale * 1 / 2 * (5 * x * x * x - 3 * x);
            }
        }
        return pot;

    }
}


/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}