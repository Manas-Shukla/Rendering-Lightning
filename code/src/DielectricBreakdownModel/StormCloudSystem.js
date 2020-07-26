import GLBL from './Globals';
import Charge from './Charge';
import Candidate from './Candidate';
import ArcsGraph from './ArcsGraph';
import * as utils from './Utils';

export default class StormCloudSystem {
    constructor(eta, cloudplane, cloudcenter, groundplane, groundsigma, R1, R2, A, hitsBoundary) {

        this.charges = {};
        // List of dicts since might have multiple candidate selection sets
        this.candidates = [];
        this.eta = eta;
        this.cloudplane = cloudplane;
        this.cloudcenter = cloudcenter;
        this.groundplane = groundplane;
        this.groundsigma = groundsigma;
        this.R1 = R1;
        this.R2 = R2;
        this.A = A;
        this.hitsBoundary = hitsBoundary;
        this.graph = new ArcsGraph();
        this.graph.rootAt(cloudcenter);
    }

    init() {
        // free up older configuration
        this.charges = {}
        this.candidates = []
        this.graph = new ArcsGraph()

        this.graph.rootAt(this.cloudcenter.toString());
        var candidate1 = {}
        var rootkey = this.cloudcenter.toString()
        candidate1[rootkey] = new Candidate(
            rootkey,
            this.cloudcenter,
            this.planePotential([0, 0, 0]),
            null
        )
        this.candidates.push(candidate1)
        // console.log(this.candidates[0][rootkey], "d")
        this.graph.insertNode(rootkey, this.cloudcenter, this.planePotential([0, 0, 0]), rootkey)
        this.insertCharge(rootkey, this.R1,  this.cloudcenter, -1)

        // console.log(this.charges, "gu")
        delete this.candidates[0][rootkey];

        this.charges[rootkey].getCandidatesPos(this.A).forEach((cpos) => {
            this.insertCandidate(cpos.toString(), cpos, rootkey, 0);
            // console.log("f")
            // var tm = Object.assign({},this.candidates[0][cpos.toString()])
            // console.log(tm,"Hello")
        })
        // var cd = [3, 3, 3]
        // var tm = Object.assign({},this.candidates[0])
        // console.log(tm,"Hello")
        // update charges list to original
    }

    planePotential(coord) {
        return - (this.groundsigma * coord[1]) / 2 - (this.groundsigma * (this.groundplane - this.cloudplane)) / 2
    }

    isCandidate(key) {
        for(var i = 0; i < this.candidates.length; i++)
        {
            if(this.candidates[i].hasOwnProperty(key))
                return true
        }
        return false
    }

    insertCharge(key, rad, pos, charge) {
        // insert charge
        // console.log(pos)
        const ch = new Charge(key, rad, pos, charge, (cpos) => {
            return  - this.R1 / utils.distance(pos, cpos);
        }, GLBL.neighbour)
        this.charges[ch.key] = ch;
        
        // console.log(ch.calcPotential([0,0,3]))
        // update pot at candidates
        for (var i = 0; i < this.candidates.length; i++)
        {
            Object.keys(this.candidates[i]).forEach((k) => {
                // console.log(this.candidates[i][k][[0, 0, 0].toString()], "i call")
                // console.log(this.candidates, "I ccal")
                this.candidates[i][k].potential += ch.calcPotential(this.candidates[i][k].position)
                // console.log(this.candidates[i][k].potential, "i call2")
            })
        }
    }

    insertCandidate(key, pos, pkey, ckey) {
        // insert candidate site and update its potential due to all charges
        // console.log(key,pos,pkey,ckey,"insertCan")
        if (!this.charges.hasOwnProperty(key) && !this.isCandidate(key)) {
            let potential = this.planePotential(pos);
            Object.keys(this.charges).forEach((k) => {
                potential += this.charges[k].calcPotential(pos)
            })
            // if (pos == [0,0,3])
                // console.log(potential,"insertCan")
            const cand = new Candidate(key, pos, potential, pkey)
            // if (pos == [0,0,3])
            //     console.log(cand.potential,"insertCan")
            this.candidates[ckey][key] = cand;
        }
        // var tm = Object.assign({},this.candidates[0][key])
        // console.log(tm,"Hello")
    }

    evolveOnce(ckey) {
        // calc prob of candidate sites
        // console.log("once")
        const keys = Object.keys(this.candidates[ckey]);
        // var tm = Object.assign({},this.candidates[ckey])
        // var cd = [0,0,3]
        // console.log(tm[cd.toString()])
        // console.log(this.charges)
        const phiVals = keys.map(k => this.candidates[ckey][k].potential);
        // console.log(phiVals)
        const phiMin = Math.min(...phiVals);
        const phiMax = Math.max(...phiVals);
        if ((phiMax - phiMin) < GLBL.EPS) throw Error('div by zero diff');

        const phiNormalized = phiVals.map(phi => (phi - phiMin) / (phiMax - phiMin));
        const probs = phiNormalized.map(phi => Math.pow(phi, this.eta));

        // sample a candidate site from prob dist
        const key = keys[utils.getSampleIndex(probs)];
        // console.log(key)
        const cand = this.candidates[ckey][key];
        // console.log("hi",cand,ckey,key)
        const res = [this.charges[cand.parentKey].position, cand.position];

        // 0.update graph
        this.graph.insertNode(key, cand.position, cand.potential, cand.parentKey)

        // 1.insert a charge at this site
        this.insertCharge(key, this.R1, cand.position, this.charges[cand.parentKey].charge)

        // 2.delete this as candidate site
        delete this.candidates[ckey][key];

        // 3.insert candidate sites of new charge added
        this.charges[key].getCandidatesPos(this.A).forEach((cpos) => {
            this.insertCandidate(cpos.toString(), cpos, key, ckey);
        })
        // console.log("key",key)
        return { 'endPoints': res, key };
    }

    evolve(steps = Infinity) {
        // run for step iteration 
        // if end point hits boundary stop
        for (let i = 0; i < steps; i++) {
            // console.log(i)

            const { endPoints, key } = this.evolveOnce(0);
            if (this.hitsBoundary(endPoints[1])) {
                // console.log('hit', key)
                // update graph channels 
                this.graph.boundaryAt(key.toString());
                this.graph.calcChannels();
                return true;
            }
        }
        return false;
    }
}
