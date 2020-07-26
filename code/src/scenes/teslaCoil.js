import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import GLBL from '../DielectricBreakdownModel/Globals';
import ElectroStaticSystem from '../DielectricBreakdownModel/ElectroStaticSystem';
import * as utils from '../DielectricBreakdownModel/Utils';
import GraphRenderer from '../DielectricBreakdownModel/GraphRenderer'

export default function teslaCoil() {

    //  create scene and setup camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 100, 200);
    camera.lookAt(0, 0, 0);
    camera.layers.enable(1);

    // init the renderer
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;

    // init the composer
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new BloomPass(
        1.5,    // strength
        3,   // kernel size
        0.2,    // sigma ?
        2560,  // blur render target resolution
    );
    // bloomPass.renderToScreen = true

    const filmPass = new FilmPass(
        0.35,   // noise intensity
        0.025,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
    );
    filmPass.renderToScreen = true;

    composer.addPass(bloomPass);
    composer.addPass(filmPass);

    // setup lightning
    const color = 0xFFFFFF;
    const intensity = 2;
    const light = new THREE.DirectionalLight(color, intensity);
    const ambient = new THREE.AmbientLight(new THREE.Color(1, 1, 1), 0.1);
    light.position.set(-1, 2, 4);
    light.layers.enable(1);
    ambient.layers.enable(1);
    scene.add(light);
    scene.add(ambient);

    // enable window resize response
    window.addEventListener('resize', () => {
        const height = window.innerHeight;
        const width = window.innerWidth;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    })

    // add controls to scene
    const controls = new OrbitControls(camera, renderer.domElement);

    // create a 3d object holder
    const objectsHolder = new THREE.Object3D();

    // create texture loader
    const texLoader = new THREE.TextureLoader();


    // create bottom box 
    const boxl = 50, boxh = 5, boxw = 50;
    const boxGeo = new THREE.BoxBufferGeometry(boxl, boxh, boxw)
    const boxMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/Walnut.jpg'),
    });
    const bottomBox = new THREE.Mesh(boxGeo, boxMat);

    // create primary coil
    const primCoilRadius = 10;
    const primCoilHeight = 60;
    const primCoilGeo = new THREE.CylinderBufferGeometry(primCoilRadius, primCoilRadius, primCoilHeight, 32);
    const primCoilMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/cwire.jpg')
    })
    const primCoil = new THREE.Mesh(primCoilGeo, primCoilMat);

    // create secondary coil
    const secCoil = new THREE.Object3D();
    const secCoilRadius = 15
    const secCoilTubRadius = 0.5;
    const secGeo = new THREE.TorusBufferGeometry(secCoilRadius, secCoilTubRadius, 10, 30);
    const secMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/sc.jpeg')
    });

    const harr = [-4, , -2, 0, 2, 4];
    (harr).forEach((dy) => {
        const sc = new THREE.Mesh(secGeo, secMat);
        sc.translateY(dy);
        sc.rotateX(Math.PI / 2);
        secCoil.add(sc);
    })

    // create holdingrods
    const hrods = new THREE.Object3D();
    const hrodl = 2, hrodw = 2, hrodh = 2 * harr[harr.length - 1] + 1;
    const hrodGeo = new THREE.BoxBufferGeometry(hrodl, hrodh, hrodw);
    const hrodMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/rod.jpg')
    });

    ([Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]).forEach((theta) => {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const hrod = new THREE.Mesh(hrodGeo, hrodMat);
        hrod.translateX(secCoilRadius * c);
        hrod.translateZ(secCoilRadius * s);
        hrod.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), theta);
        hrods.add(hrod);
    })


    // create top toroid ring 
    const torTubeRadius = 5;
    const toroidGeo = new THREE.TorusBufferGeometry(primCoilRadius + torTubeRadius, torTubeRadius, 10, 30);
    const toroidMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/tor.jpg')
    })

    const tor = new THREE.Mesh(toroidGeo, toroidMat);

    // create top disc
    const topdiscGeo = new THREE.CylinderBufferGeometry(primCoilRadius, primCoilRadius, 2, 32);
    const topdisc = new THREE.Mesh(topdiscGeo, toroidMat);

    tor.rotateX(Math.PI / 2);

    // combine them into toroid
    const toroid = new THREE.Object3D();
    toroid.add(tor);
    toroid.add(topdisc);

    // create top electrode
    const elR = 1;
    const elH = 15;
    const elGeo = new THREE.ConeBufferGeometry(elR, elH, 30);
    const elMat = new THREE.MeshPhongMaterial({
        color: 'grey'
    });
    const eltrd = new THREE.Mesh(elGeo, elMat);





    /* create teslacoil */
    // add bottom box
    objectsHolder.add(bottomBox);

    // add secondary coil with holder
    secCoil.translateY(boxh / 2 + harr[harr.length - 1] + secCoilTubRadius);
    hrods.translateY(boxh / 2 + harr[harr.length - 1] + secCoilTubRadius);
    objectsHolder.add(hrods);
    objectsHolder.add(secCoil);

    // add primary coil
    primCoil.translateY(boxh / 2 + primCoilHeight / 2);
    objectsHolder.add(primCoil);

    // add toroid 
    toroid.translateY(boxh / 2 + primCoilHeight)
    objectsHolder.add(toroid);

    // add top electrode

    eltrd.translateY(elH / 2 + boxh / 2 + primCoilHeight);
    objectsHolder.add(eltrd);

    // define charge generator
    function generateCharges(H, R, r, n = 30) {
        // sample list of charges on toroid
        let chargesList = []
        for (let theta = 0; theta <= 2 * Math.PI; theta += 2 * Math.PI / n) {
            for (let phi = 0; phi <= Math.PI; phi += Math.PI / n) {
                const rcos = r * Math.cos(phi);
                const rsin = r * Math.sin(phi);
                const y = H + rcos;
                const x = (rsin + R) * Math.cos(theta);
                const z = (rsin + R) * Math.sin(theta);

                chargesList.push([x, y, z]);
            }
        }
        return chargesList;
    }

    // const chargesList = generateCharges(primCoilHeight + boxh / 2, primCoilRadius + torTubeRadius, torTubeRadius, 4);
    const chargesList = [[0, elH + boxh / 2 + primCoilHeight, 0]];

    function renderCharge() {

        const obj = new THREE.Object3D()
        chargesList.forEach(p => {
            const dotGeometry = new THREE.BoxBufferGeometry(2, 2, 2);
            const dot = new THREE.Mesh(dotGeometry, boxMat);
            dot.translateX(p[0]);
            dot.translateY(p[1]);
            dot.translateZ(p[2]);
            obj.add(dot);
        })
        console.log(chargesList);
        scene.add(obj);
    }


    /* 
    init the system of charges
    */
    let origin = [0, primCoilHeight + boxh / 2, 0]

    function createArcSystem() {
        return new ElectroStaticSystem(chargesList, 8, 1.25, 30, 2.5, (pos) => {
            return utils.distance(pos, origin) > 30;
        }, utils.potFuncForUnitCenteredCharge)
    }

    let arcSystem = createArcSystem();


    // iterate once 
    arcSystem.init()
    arcSystem.evolve()
    let graph = arcSystem.graph;

    // init the arc holder 3d object
    let arcHolder = new THREE.Object3D();
    arcHolder.layers.set(1);

    // init the graph renderer
    let graphRenderer = new GraphRenderer(graph, arcHolder, [
        GLBL.primCol,
        GLBL.secCol
    ], [GLBL.primRad, GLBL.secRad])

    // add to scene
    scene.add(objectsHolder);
    scene.add(arcHolder);

    const speed = 10;
    // define scene update function
    const update = () => {
        for (let i = 0; i < speed - 1; i++)graphRenderer.updateScene();
        if (!graphRenderer.updateScene()) {
            // refresh
            scene.remove(arcHolder);
            arcSystem.init();
            arcSystem.evolve();
            graph = arcSystem.graph;
            arcHolder = new THREE.Object3D();
            arcHolder.layers.set(1);
            graphRenderer = new GraphRenderer(graph, arcHolder, [
                GLBL.primCol,
                GLBL.secCol
            ], [GLBL.primRad, GLBL.secRad]);
            scene.add(arcHolder);
        }

    }


    // setup sound before rendering
    // create an AudioListener and add it to the camera
    const listener = new THREE.AudioListener();
    camera.add(listener);

    // create a global audio source
    const sound = new THREE.Audio(listener);

    // load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/data/tc.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
    });



    // setup the render loop
    let then = 0;
    function render(now) {
        now *= 0.001;
        const delta = now - then;
        then = now;
        //update the scene
        update();
        renderer.clear();

        // render arcs of tesla coil
        camera.layers.set(1);
        composer.render(delta);

        // render model of tesla coil
        renderer.clearDepth();
        camera.layers.set(0);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

