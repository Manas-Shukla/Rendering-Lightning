/**
 * class representing candidate site for breakdown
 * Attr:
 *  key
 *  position
 *  potential
 *  parentKey
 * 
 * Methods:
 *  
 */

export default class Candidate {

    constructor(key, position, potential, parentKey) {
        this.key = key;
        this.position = position;
        this.potential = potential;
        this.parentKey = parentKey;
    }
    
    getPosition () {
        return this.position;
    }

}
