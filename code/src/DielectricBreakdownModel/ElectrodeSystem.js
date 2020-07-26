import GLBL from './Globals';
import Charge from './Charge';
import Candidate from './Candidate';
import ArcsGraph from './ArcsGraph';
import * as utils from './Utils';
import  * as THREE from 'three'

export default class ElectrodeSystem {
    constructor(eta, sphereCenter1, sphereCenter2, R1, R2, A, hitsBoundary) {

        this.charges = {};
        // List of dicts since might have multiple candidate selection sets
        this.candidates = [];
        this.eta = eta;
        this.sphereCenter1 = sphereCenter1
        this.sphereCenter2 = sphereCenter2
        this.R1 = R1;
        this.R2 = R2;
        this.A = A;
        this.hitsBoundary = hitsBoundary;
        this.positiveBreak = false;
        this.arcFinish = false   // flag2
        this.arcRadius = 0.0    // lowest
        this.graph = new ArcsGraph();
        this.graph.rootAt(sphereCenter1);
        this.tempDest = [this.sphereCenter1[0], this.sphereCenter1[1] - this.R2, this.sphereCenter1[2]]

        var v1 = new THREE.Vector3(0,-1,0)
        var v2 = new THREE.Vector3(sphereCenter2[0]-sphereCenter1[0],sphereCenter2[1]-sphereCenter1[1],sphereCenter2[2]-sphereCenter1[2])
        var v3 = new THREE.Vector3(0,0,0)
        v3.crossVectors(v1, v2)
        v3.normalize()
        this.axis = v3
        this.rotateAngle = v2.angleTo(v1)
        this.transform = (pos) => {
            var a = new THREE.Vector3(pos[0]-this.sphereCenter1[0], pos[1]-this.sphereCenter1[1], pos[2]-this.sphereCenter1[2])
            a.applyAxisAngle(this.axis, this.rotateAngle)
            // console.log([a.x+this.sphereCenter1[0], a.y+this.sphereCenter1[1], a.z+this.sphereCenter1[2]],"helo")
            return [a.x+this.sphereCenter1[0], a.y+this.sphereCenter1[1], a.z+this.sphereCenter1[2]]
        }
        // console.log(this.transform([0,-60,0]), "x")
        // console.log(this.rotateAngle)
    }

    // getAxisRot () {
    //     var v1 = new THREE.Vector3(0,-1,0)
    //     var v2 = new THREE.Vector3(this.sphereCenter1[0]-this.sphereCenter2[0],this.sphereCenter1[1]-this.sphereCenter2[1],this.sphereCenter1[2]-this.sphereCenter2[2])
    //     var v3 = new THREE.Vector3(0,0,0)
    //     v3.crossVectors(v1, v2)
    //     v3.normalize()
    //     this.axis = v2
    // }

    init(sphereCenter2) {
        // free up older configuration
        // console.log(this.transform([0,-60,0]))
        this.sphereCenter2 = sphereCenter2
        var v1 = new THREE.Vector3(0,-1,0)
        var v2 = new THREE.Vector3(this.sphereCenter2[0]-this.sphereCenter1[0],this.sphereCenter2[1]-this.sphereCenter1[1],this.sphereCenter2[2]-this.sphereCenter1[2])
        var v3 = new THREE.Vector3(0,0,0)
        v3.crossVectors(v1, v2)
        v3.normalize()
        this.axis = v3
        this.rotateAngle = v2.angleTo(v1)
        this.transform = (pos) => {
            var a = new THREE.Vector3(pos[0]-this.sphereCenter1[0], pos[1]-this.sphereCenter1[1], pos[2]-this.sphereCenter1[2])
            a.applyAxisAngle(this.axis, this.rotateAngle)
            // console.log([a.x+this.sphereCenter1[0], a.y+this.sphereCenter1[1], a.z+this.sphereCenter1[2]],"helo")
            return [a.x+this.sphereCenter1[0], a.y+this.sphereCenter1[1], a.z+this.sphereCenter1[2]]
        }
        this.charges = {}
        this.candidates = []
        this.positiveBreak = false
        this.arcRadius = 0
        this.arcFinish = false
        this.graph = new ArcsGraph()

        this.graph.rootAt(this.sphereCenter1.toString());
        this.graph.transform = this.transform
        var candidate1 = {}
        var candidate2 = {}
        var rootkey = this.sphereCenter1.toString()
        candidate1[rootkey] = new Candidate(
            rootkey,
            this.sphereCenter1,
            0,
            rootkey
        )
        this.candidates.push(candidate1)
        this.candidates.push(candidate2)
        // console.log("init")
        this.graph.insertNode(rootkey, this.transform(this.sphereCenter1), 0, rootkey)
        this.insertCharge(rootkey, this.R1,  this.sphereCenter1, -1)

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
        var negPot = (cpos) => {
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
        };
        var posPot = (cpos) => {
            const r = utils.distance(pos, cpos);
            return this.R1 / r;
        }
        var ch = null
        if (charge<0)
            {
                // console.log(GLBL.neighbour,"Neight")
                ch = new Charge(key, rad, pos, charge, negPot, GLBL.neighbour)
            }
        else {
            var nhbr = Object.assign({}, GLBL.neighbour)
            nhbr.ly = 1
            // console.log(GLBL.neighbour,"ght")
            ch = new Charge(key, rad, pos, charge, posPot, nhbr)
        }

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
        // console.log("insertcan")
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
            // console.log("first")
        }
        else if(( this.charges.hasOwnProperty(key) && (this.charges[key].charge != this.charges[pkey].charge)) ||
                this.candidates[1-ckey].hasOwnProperty(key))
        {
            this.arcFinish = true
            var e1 = this.charges[pkey].position;
            var e2 = pos;
            var e3 = null;
            if (this.charges.hasOwnProperty(key))
            {
                e3 = this.charges[this.graph.nodes[key].pkey].position
            }
            else if(this.isCandidate(key))
            {
                e3 = this.charges[this.candidates[1-ckey][key].parentKey].position
            }
            // console.log("second")
            // console.log(this.graph.nodes[pkey],ckey,"This")
            // var l = pos.toString()
            // console.log(this.graph.nodes)
            // if(ckey == 0)
            // console.log(key, pkey, ckey,"second")
            // this.graph.insertNode(e2.toString(), this.transform(e2), 0, e1.toString())

            var cur_key = null
            var cur_pkey = null

            if (this.charges[pkey].charge>0) {
                cur_key = e1.toString()
                cur_pkey = e2.toString()
                this.graph.insertNode(e2.toString(), this.transform(e2), 0, e3.toString())
            }
            else {
                cur_key = e3.toString()
                cur_pkey = e2.toString()
                this.graph.insertNode(e2.toString(), this.transform(e2), 0, e1.toString())
            }

            // if (this.charges[pkey].charge>0) {
            //     var cur_key = e1.toString()
            //     var cur_pkey = e2.toString()

            //     this.graph.insertNode(e2.toString(), this.transform(e2), 0, e3.toString())
            var t = 0;
            while (true) {
                t+=1
                // console.log(cur_key, cur_pkey, this.graph.nodes[cur_key].pkey, "loop")
                var tmp1 = this.graph.nodes[cur_key].pkey
                delete this.graph.adjList[tmp1][cur_key]
                if(this.graph.adjList.hasOwnProperty(cur_pkey))
                    this.graph.adjList[cur_pkey][cur_key] = 1
                else
                    this.graph.adjList[cur_pkey] = {[cur_key] : 1}
                this.graph.nodes[cur_key].pkey = cur_pkey
                cur_pkey = cur_key
                cur_key = tmp1
                if(cur_pkey == this.tempDest.toString())
                    break
            }
            // var key = [0,-60,0]
            // while(key!==this.graph.root) {
            //         console.log("Hello", key, this.graph.root, this.graph.boundary, this.graph.nodes[key])
            //         let pkey = this.graph.nodes[key].pkey;
            //         this.graph.adjList[pkey][key] = 0;
            //         key = pkey;
            //     }
                // while()
            // }
            // else{
            //     console.log("no loop")

            // }
            // this.graph.insertNode(e3.toString(), this.transform(e3), 0, e1.toString())
            // while(l!=[0, -1*this.R2, 0] && l!=this.sphereCenter1)
            // {
            //     console.log(ckey, l, pkey,"d")
            //     l = this.graph.nodes[l].pkey
            // }
            // this.graph.insertNode(e2.toString(), this.transform(e2), 0, e1.toString())
            // this.graph.insertNode(e3.toString(), this.transform(e3), 0, e1.toString())
            // this.graph.boundaryAt(e1.toString())
            // e1
        }
        // var tm = Object.assign({},this.candidates[0][key])
        // console.log(tm,"Hello")
    }

    evolveOnce(ckey) {
        // calc prob of candidate sites
        // console.log(ckey)
        // console.log(this.candidates[0], "heo")
        // console.log(this.candidates[1], "helo")
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
        // console.log(ckey, "evolveonce")
        this.graph.insertNode(key, this.transform(cand.position), cand.potential, cand.parentKey)

        // 1.insert a charge at this site
        this.insertCharge(key, this.R1, cand.position, this.charges[cand.parentKey].charge)

        // 2.delete this as candidate site
        delete this.candidates[ckey][key];

        // 3.insert candidate sites of new charge added
        this.charges[key].getCandidatesPos(this.A).forEach((cpos) => {
            if(this.arcFinish)
            return;
            this.insertCandidate(cpos.toString(), cpos, key, ckey);
        })
        // console.log("key",key)
        return { 'endPoints': res, key };
    }

    evolve(steps = Infinity) {
        // run for step iteration 
        // if end point hits boundary stop
        // console.log("lets go")
        for (let i = 0; i < steps; i++) {
            // console.log(i)
            if(this.arcFinish)
                {
                    this.graph.boundaryAt(this.tempDest.toString());
                    this.graph.calcChannels();
                    return
                }
            const { endPoints, key } = this.evolveOnce(0);
            this.arcRadius = Math.max(utils.distance(this.sphereCenter1, endPoints[1]), this.arcRadius)
            if (this.arcRadius/this.R2 > 0.7 && !this.positiveBreak)
            {
                this.positiveBreak = true
                var posRootkey = this.tempDest.toString()
                this.candidates[1][posRootkey] = new Candidate(
                    posRootkey,
                    this.tempDest,
                    0,
                    posRootkey
                )
                // console.log("evolve")
                this.graph.insertNode(posRootkey, this.transform(this.tempDest), 0, posRootkey)

                this.insertCharge(posRootkey, this.R1,  this.tempDest, 1)

                // console.log(this.charges, "gu")
                delete this.candidates[1][posRootkey];

                this.charges[posRootkey].getCandidatesPos(this.A).forEach((cpos) => {
                    if(this.arcFinish)
                        return;
                    // console.log(cpos)
                    this.insertCandidate(cpos.toString(), cpos, posRootkey, 1);
                    // console.log("f")
                    // var tm = Object.assign({},this.candidates[0][cpos.toString()])
                    // console.log(tm,"Hello")
                })                
            }
            else if(this.positiveBreak)
            {   
                const { ep, ky } = this.evolveOnce(1);
            }
            if (this.hitsBoundary(endPoints[1])) {
                // console.log(this.transform(endPoints[1]))
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
