import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
import GLBL from '../DielectricBreakdownModel/Globals';
import PlasmaBallSystem from '../DielectricBreakdownModel/PlasmaBallSystem';
import * as utils from './DielectricBreakdownModel/Utils';
import GraphRenderer from '../DielectricBreakdownModel/GraphRenderer'

const testModel = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ canvas });
    var geometry = new THREE.SphereGeometry( 70, 0, 0 );
    var geometry1 = new THREE.SphereGeometry( 5, 0, 0 );
    geometry1.translate(60,0,0)
    // geometry1.translate(3,-60,0)
    var material = new THREE.MeshBasicMaterial( {color: 0xf00000} );
    var material1 = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    material.transparent = true
    material.opacity = 0.4
    var sphere = new THREE.Mesh( geometry, material );
    var sphere1 = new THREE.Mesh( geometry1, material1 );
    scene.add( sphere );
    scene.add( sphere1 );
    {
        const color = 0xFFFFFF;
        const intensity = 2;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        scene.add(light);
    }


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



    window.addEventListener('resize', () => {
        const height = window.innerHeight;
        const width = window.innerWidth;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    })

    const controls = new OrbitControls(camera, renderer.domElement);
    // const geometry = new THREE.BoxGeometry(10, 10, 10);

    // const material = new THREE.MeshBasicMaterial({color:'white'});
    // const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    const gui = new GUI();
    {
        const folder = gui.addFolder('BloomPass');
        folder.add(bloomPass.copyUniforms.opacity, 'value', 0, 2).name('strength');
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

    //keep R2 == radius for now
    var center = [0,0,0]
    // BUG!! transform function in PlasmaModel does something unexpected when either of the endpoints become [0,-x,0] when x>0
    // This has got to do something with the initial lightning growth in the negative y direction not sure exactly what???!
    var end = [60,0,0]
    let system = new PlasmaBallSystem(5.2, center, end, 1.5, 60, 3, (pos) => {
        return utils.distance(pos, center) > 60;
    // }, utils.potFuncForUnitCenteredCharge)
    })


    system.init(end)
    system.evolve()
    let graph = system.graph;
    graph.calcChannels();
    let gr = new GraphRenderer(graph,new THREE.Object3D(),[
        GLBL.primCol,
        GLBL.secCol
    ],[GLBL.primRad,GLBL.secRad])
    
    scene.add(gr.sceneObj);
    let flag = false;
    const update = () => {
        // gr.updateScene();
        // gr.updateScene();
        gr.updateScene();
        if(!gr.updateScene()) {
            // done updating start again
            scene.remove(gr.sceneObj);
            system.init([60, 0, 0])
            system.evolve()
            graph = system.graph
            graph.calcChannels();
            gr = new GraphRenderer(graph,new THREE.Object3D(),[
                GLBL.primCol,
                GLBL.secCol
            ],[GLBL.primRad,GLBL.secRad])
            scene.add(gr.sceneObj);
        }
    }
    
    let then = 0;
    function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;
        update();
        // renderer.render(scene, camera);
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

export default testModel;