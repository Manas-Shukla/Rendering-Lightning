import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';


const a = 3.0 // grid cell width/height
const R1 = a / 2;
const R2 = 50;
const n = 5;
const epsilon = 1e-10;
const origin = [0, 0, 0];
const dest = [0,-60,0];
// stores current charges in configuration
let charges = [];

// stores possible locations of breakdown
let candidates = {};

// maintains already marked candidates sites
let vis = new Set();

function distance(p1, p2) {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2)
}

function getCandidates(pos) {
    const res = [];
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            for (let k = -1; k <= 1; k++) {
                if (i == j && k == j && i == 0) continue;
                res.push([pos[0] + i * a, pos[1] + j * a, pos[2] + k * a]);
            }
        }
    }
    return res;
}

// src : https://gist.github.com/brannondorsey/dc4cfe00d6b124aebd3277159dcbdb14
// sample from probability
function sample(probs) {
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

function placeCharge(coord, charge) {

    const newCharge = {
        R: R1,
        pos: coord,
        calcPotential: function (cpos) {
            const r = distance(this.pos, cpos);
            return charge * this.R / r;
        }
    }

    charges.push(newCharge);
    vis.add(coord.toString());

    // update existing potentials of candidates 
    Object.keys(candidates).forEach(key => {
        candidates[key].potential += newCharge.calcPotential(candidates[key].pos);
    })

    // get new candidates
    getCandidates(coord).forEach((cpos) => {
        const key = cpos.toString();
        if (!vis.has(key)) {

            let totPotential = 0.0;
            charges.forEach(c => {
                totPotential += c.calcPotential(cpos);
            })
            candidates[key] = {
                pos: cpos,
                potential: totPotential,
                parent: coord,
                parentcharge: charge
            };

            vis.add(key);
        }
    });

}


function iterateOnce() {
    // returns a line
    const keys = Object.keys(candidates);
    const phiVals = keys.map(k => candidates[k].potential);
    const phiMin = Math.min(...phiVals);
    const phiMax = Math.max(...phiVals);
    if ((phiMax - phiMin) < epsilon) throw Error('div by zero diff');

    const phiNormalized = phiVals.map(phi => (phi - phiMin) / (phiMax - phiMin));
    const probs = phiNormalized.map(phi => Math.pow(phi, n));
    const key = keys[sample(probs)];

    const cpos = candidates[key].pos;
    const ppos = candidates[key].parent;
    const res = [ppos,cpos];
    placeCharge(cpos, candidates[key].parentcharge)
    delete candidates[key];

    return res;
}

function getLine(points) {
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(0,255,255) });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    return line;
}

const dbm = () => {
    placeCharge(origin, -1);
    placeCharge(dest, 1);

    // setup scene and camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    const canvas = document.querySelector('#c');


    // get renderer
    const renderer = new THREE.WebGLRenderer({ canvas });


    // setup lightning
    {
        const color = 0xFFFFFF;
        const intensity = 2;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        scene.add(light);
    }

    // add effects 
    renderer.setSize(window.innerWidth, window.innerHeight);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new BloomPass(
        2,    // strength
        9,   // kernel size
        0.7,    // sigma ?
        2560,  // blur render target resolution
    );
    composer.addPass(bloomPass);

    const filmPass = new FilmPass(
        0.35,   // noise intensity
        0.025,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
    );
    filmPass.renderToScreen = true;
    // document.body.appendChild(renderer.domElement);
    composer.addPass(filmPass);


    // add window resize 
    window.addEventListener('resize', () => {
        const height = window.innerHeight;
        const width = window.innerWidth;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    })

    // add control
    const controls = new OrbitControls(camera, renderer.domElement);

    let glbl_lines = []
    let flag = false;
    const update = () => {
        if (flag) return flag;
        const endPoints = iterateOnce();
        const _l = getLine(([new THREE.Vector3(...endPoints[0]), new THREE.Vector3(...endPoints[1])]));
        glbl_lines.push(_l)
        scene.add(_l);
        if (distance(endPoints[1],origin) > R2) {
            flag = true;
            console.log('boundary hit')
            // refresh
            glbl_lines.forEach(e=>{
                scene.remove(e);
            })
            glbl_lines = [];
            candidates = {}
            charges = [];
            vis = new Set();
        }
        return flag;
    }

    let obj = {x:1};
    // effects controller
    const gui = new GUI();
    {
        const folder = gui.addFolder('BloomPass');
        folder.add(bloomPass.copyUniforms.opacity, 'value', 0, 2).name('strength');
        folder.open();
        
    }
    {
        const folder = gui.addFolder('tmp');
        folder.add(obj, 'x', 0, 2).name('strength').onChange(e=>console.log(e))
        
        folder.open();
        
    }
    {
        const folder = gui.addFolder('FilmPass');
        folder.add(filmPass.uniforms.grayscale, 'value').name('grayscale');
        folder.add(filmPass.uniforms.nIntensity, 'value', 0, 1).name('noise intensity');
        folder.add(filmPass.uniforms.sIntensity, 'value', 0, 1).name('scanline intensity');
        folder.add(filmPass.uniforms.sCount, 'value', 0, 1000).name('scanline count');
        folder.open();
    }

    // render loop
    let then = 0;
    
   
    function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;
        // renderer.render(scene, camera);
        for(let i=0;i<1;i++)update();
        if(flag){
            flag=false;
            placeCharge(origin);
        }
        composer.render(deltaTime);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // const GameLoop = () => {
    //     requestAnimationFrame(GameLoop);
    //     update();
    //     render();
    // }
    // GameLoop()

}

export default dbm;