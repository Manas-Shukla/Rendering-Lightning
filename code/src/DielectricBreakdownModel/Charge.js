/**
 * class representing charge particle
 * Attr:
 *  key
 *  radius
 *  posistion
 *  calcPotential(potential function)
 * 
 * Methods:
 *  
 */

export default class Charge {

    constructor(key, radius, position, charge, calcPotential, neighbour) {
        this.key = key
        this.charge = charge
        this.radius = radius
        this.position = position
        this.calcPotential = calcPotential
        this.neighbour = neighbour
    }
    getCandidatesPos(a) {
        // generate neighbour cells given cell width 'a'
        // console.log("getCan")
        // console.log(this.neighbour)
        const pos = this.position;
        const res = [];
        for (let i = this.neighbour.lx; i <= this.neighbour.ux; i++) {
            for (let j = this.neighbour.ly; j <= this.neighbour.uy; j++) {
                for (let k = this.neighbour.lz; k <= this.neighbour.uz; k++) {
                    if (i == j && k == j && i == 0) continue;
                    res.push([pos[0] + i * a, pos[1] + j * a, pos[2] + k * a]);
                }
            }
        }
        return res;
    }
}

