import * as THREE from 'three';
import GLBL from './Globals';


/**
 * class repr renderer for graph generated using DielectricBreakdown/stochastic Model
 * Attr:
 *  
 * Methods:
 *  
 */

export default class GraphRenderer {

    constructor(graph, sceneObj, colorCoding,sizeCoding) {
        this.graph = graph;
        this.sceneObj = sceneObj;
        this.currentNode = 0;
        this.colorCoding = colorCoding;
        this.sizeCoding = sizeCoding;
    }

    getEdgeObject(skey, dkey) {
        //create a 3d edge from source key to destination key
        let p0 = new THREE.Vector3(...this.graph.nodes[skey].pos);
        let p1 = new THREE.Vector3(...this.graph.nodes[dkey].pos);

        let v = p1.clone().sub(p0.clone())
        let u = new THREE.Vector3(0, 1, 0)
        let mid = ((p1.clone().add(p0.clone()))).divideScalar(2);
        
        // select color (based on primary or secondary)
        let cylcolor = this.colorCoding[this.graph.adjList[skey][dkey]];
        let cylradius = this.sizeCoding[this.graph.adjList[skey][dkey]];
        
        // create cylinder 
        let geometry = new THREE.CylinderGeometry(cylradius,cylradius, v.length(), 32);
        let material = new THREE.MeshBasicMaterial({ color: cylcolor });
        let cylinder = new THREE.Mesh(geometry, material);

        // transform cylinder using rotation and translation
        u = u.normalize();
        v = v.normalize();
        let axis = u.clone().cross(v);
        axis = axis.normalize();
        let angle = Math.acos(u.clone().dot(v));
        // console.log(axis,angle)
        cylinder.translateX(mid.x)
        cylinder.translateY(mid.y)
        cylinder.translateZ(mid.z)
        
        if (axis.length() > GLBL.EPS) {
            cylinder.rotateOnWorldAxis(axis, angle);
        }

        return cylinder;
    }

    updateScene() {
        if (this.currentNode >= this.graph.nodeList.length) {
            return false;
        }
        const key = this.graph.nodeList[this.currentNode];
        const node = this.graph.nodes[key];
        this.currentNode += 1;

        if (node.pkey !== -1) {
            const mask = this.sceneObj.layers.mask;
            const obj = this.getEdgeObject(node.pkey, key);
            obj.layers.mask = mask;
            this.sceneObj.add(obj);
        }
        return true;
    }


}