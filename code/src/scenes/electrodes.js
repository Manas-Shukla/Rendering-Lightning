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
import ElectrodeSystem from '../DielectricBreakdownModel/ElectrodeSystem';
import * as utils from '../DielectricBreakdownModel/Utils';
import GraphRenderer from '../DielectricBreakdownModel/GraphRenderer'



export default function electrodes() {

    //  create scene and setup camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 250);
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
    const boxl = 250, boxh = 20, boxw = 100;
    const boxGeo = new THREE.BoxBufferGeometry(boxl, boxh, boxw)
    const boxMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/metal.jpg'),
    });
    const bottomBox = new THREE.Mesh(boxGeo, boxMat);

    // create charged ball

    const ballR = 5;
    const d = 50;
    const ballGeo = new THREE.DodecahedronBufferGeometry(ballR, 3);
    const lballMat = new THREE.MeshPhongMaterial({
        color:'#330000'
    })
    const rballMat = new THREE.MeshPhongMaterial({
        color:'#00264d'
    })

    const lBall = new THREE.Mesh(ballGeo, lballMat);
    const rBall = new THREE.Mesh(ballGeo, rballMat);

    // create rods
    const rodr = 2;
    const rodR = 5;
    const rodt = 2;
    const rodH = 90;
    const numRings = 15;
    const rodGeo = new THREE.CylinderBufferGeometry(rodr, rodr, rodH, 32);
    const rodMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/rod.jpg')
    })
    const ringGeo = new THREE.TorusBufferGeometry(rodR, rodt, 10, 30);
    const ringMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/sc.jpeg')
    });

    function addRingsToRod(_rod) {
        const del = rodH / numRings;
        for (let i = del; i < rodH; i += del) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotateX(Math.PI / 2);
            ring.translateZ(rodH / 2 - i);
            _rod.add(ring);
        }
    }

    const lRod = new THREE.Object3D();
    lRod.add(new THREE.Mesh(rodGeo, rodMat));
    addRingsToRod(lRod);

    const rRod = new THREE.Object3D();
    rRod.add(new THREE.Mesh(rodGeo, rodMat));
    addRingsToRod(rRod);

    /* create electrode system */

    // add bottom box
    bottomBox.translateY(-1 * (boxh / 2 + rodH))
    objectsHolder.add(bottomBox);

    // add charged balls
    lBall.translateX(-d);
    rBall.translateX(d);
    objectsHolder.add(lBall);
    objectsHolder.add(rBall);

    // add rods
    lRod.translateY(-rodH / 2);
    lRod.translateX(-d);
    rRod.translateY(-rodH / 2);
    rRod.translateX(d);

    objectsHolder.add(lRod);
    objectsHolder.add(rRod);

    /* 
        init the system of charges
    */
    let origin = [-d, 0, 0]
    let target = [d, 0, 0];
    let arcSystem = new ElectrodeSystem(10, origin, target, 1.5, 2 * d, 3, (pos) => {
        return utils.distance(pos, origin) > 2.09 * d;
    })

    // iterate once 
    arcSystem.init(target);
    arcSystem.evolve()
    let graph = arcSystem.graph;
    graph.calcChannels();
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

    const speed = 25;
    // define scene update function
    const update = () => {
        for (let i = 0; i < speed - 1; i++)graphRenderer.updateScene();
        if (!graphRenderer.updateScene()) {
            // refresh
            scene.remove(arcHolder);
            arcSystem.init(target);
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
    audioLoader.load('/data/eltr.mp3', function (buffer) {
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

