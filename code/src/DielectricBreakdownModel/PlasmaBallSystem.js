import GLBL from './Globals';
import Charge from './Charge';
import Candidate from './Candidate';
import ArcsGraph from './ArcsGraph';
import * as utils from './Utils';
import  * as THREE from 'three'

export default class PlasmaBallSystem {
    constructor(eta, ballCenter, surfacePoint, R1, R2, A, hitsBoundary) {

        this.charges = {};
        // List of dicts since might have multiple candidate selection sets
        this.candidates = [];
        this.eta = eta;
        this.ballCenter = ballCenter
        this.surfacePoint = surfacePoint
        this.R1 = R1;
        this.R2 = R2;
        this.A = A;
        this.hitsBoundary = hitsBoundary;
        this.graph = new ArcsGraph();
        this.graph.rootAt(ballCenter);

        var v1 = new THREE.Vector3(0,-1,0)
        var v2 = new THREE.Vector3(surfacePoint[0]-ballCenter[0],surfacePoint[1]-ballCenter[1],surfacePoint[2]-ballCenter[2])
        var v3 = new THREE.Vector3(0,0,0)
        v3.crossVectors(v1, v2)
        v3.normalize()
        this.axis = v3
        this.rotateAngle = v2.angleTo(v1)
        this.transform = (pos) => {
            var a = new THREE.Vector3(pos[0]-this.ballCenter[0], pos[1]-this.ballCenter[1], pos[2]-this.ballCenter[2])
            a.applyAxisAngle(this.axis, this.rotateAngle)
            // console.log([a.x+this.ballCenter[0], a.y+this.ballCenter[1], a.z+this.ballCenter[2]],"helo")
            return [a.x+this.ballCenter[0], a.y+this.ballCenter[1], a.z+this.ballCenter[2]]
        }
        // console.log(this.transform([0,-60,0]), "x")
        // console.log(this.rotateAngle)
    }

    // transform (pos) {
    //     var a = new THREE.Vector3(pos[0]-this.ballCenter[0], pos[1]-this.ballCenter[1], pos[2]-this.ballCenter[2])
    //     a.applyAxisAngle(this.axis, this.rotateAngle)
    //     return [a[0]+this.ballCenter[0], a[1]+this.ballCenter[1], a[2]+this.ballCenter[2]]
    // }

    init(surfacePoint) {
        // free up older configuration
        // console.log(this.transform([0,-60,0]), "x")
        this.surfacePoint = surfacePoint
        var v1 = new THREE.Vector3(0,-1,0)
        var v2 = new THREE.Vector3(this.surfacePoint[0]-this.ballCenter[0],this.surfacePoint[1]-this.ballCenter[1],this.surfacePoint[2]-this.ballCenter[2])
        var v3 = new THREE.Vector3(0,0,0)
        v3.crossVectors(v1, v2)
        v3.normalize()
        this.axis = v3
        this.rotateAngle = v2.angleTo(v1)
        this.transform = (pos) => {
            var a = new THREE.Vector3(pos[0]-this.ballCenter[0], pos[1]-this.ballCenter[1], pos[2]-this.ballCenter[2])
            a.applyAxisAngle(this.axis, this.rotateAngle)
            // console.log([a.x+this.ballCenter[0], a.y+this.ballCenter[1], a.z+this.ballCenter[2]],"helo")
            return [a.x+this.ballCenter[0], a.y+this.ballCenter[1], a.z+this.ballCenter[2]]
        }
        this.charges = {}
        this.candidates = []
        this.graph = new ArcsGraph()

        this.graph.rootAt(this.ballCenter.toString());
        var candidate1 = {}
        var rootkey = this.ballCenter.toString()
        candidate1[rootkey] = new Candidate(
            rootkey,
            this.ballCenter,
            0,
            rootkey
        )
        this.candidates.push(candidate1)
        // console.log(this.candidates[0][rootkey], "d")
        this.graph.insertNode(rootkey, this.transform(this.ballCenter), 0, rootkey)
        this.insertCharge(rootkey, this.R1,  this.ballCenter, -1)

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
            const r = utils.distance(pos, cpos);
            // return (1 - this.R / r);
            const c = [ -1/5, 1, -21/10, 1];
            var pot = 0 ;
            const dif = [cpos[0] - pos[0], cpos[1] - pos[1], cpos[2] - pos[2]];
            const nrm = utils.distance(dif, [0,0,0]);
            const theta = Math.acos(dif[1]/nrm);
            for (let l = 0; l < 4; l++)
            {
                const al = c[l] * (1/(Math.pow(this.R2,l) - Math.pow(this.R1, 2*l+1)/Math.pow(this.R2, l+1)));
                const bl = -1 * Math.pow(this.R1, 2*l+1) * al;
                const scale = -1 * (al*Math.pow(r,l) + bl*1/Math.pow(r,l+1));
                if( l==0 )
                {
                    pot += scale;
                }
                else if( l==1 )
                {
                    const x = Math.cos(theta);
                    pot += scale * x;
                }
                else if( l==2 )
                {
                    const x = Math.cos(theta);
                    pot += scale * 1/2 * (3*x*x - 1);
                }
                else if( l==3 )
                {
                    const x = Math.cos(theta);
                    pot += scale * 1/2 * (5*x*x*x - 3*x);
                }
            }
            return pot;
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
            let potential = 0;
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
        this.graph.insertNode(key, this.transform(cand.position), cand.potential, cand.parentKey)

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
                // console.log(endPoints[1], "H1")
                // console.log(this.transform(endPoints[1]), "H2")
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
