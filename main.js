import './style.css'
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let camera, scene, renderer;
let controls, water, sun;

const loader = new GLTFLoader();

function random(min, max)
{
    return Math.random() * (max - min) + min;
}

class Boat
{
    constructor()
    {
        loader.load("assets/boat/scene.gltf", (gltf) =>
        {
            scene.add( gltf.scene )
            gltf.scene.scale.set(3, 3, 3)
            // randomly generate position
            gltf.scene.position.x = random(-1000, 1000)
            gltf.scene.position.z = random(-1000, 1000)
            gltf.scene.position.y = 13
            gltf.scene.rotation.y = 2

            this.boat = gltf.scene
            this.speed =
            {
                vel: 0,
                rot: 0,
                acc: 0.1,
                maxVel: 10,
            }

            this.move =
            {
                notRotating: true,
                notAccelerating: true,
            }
        })
    }

    update()
    {
        if(this.boat)
        {
            this.boat.rotation.y += this.speed.rot
            this.boat.translateX(this.speed.vel)
            camera.position.x = Math.cos(Math.PI - boat.boat.rotation.y) * 100 + this.boat.position.x + 10
            camera.position.z = Math.sin(Math.PI - boat.boat.rotation.y) * 100 + this.boat.position.z + 10
            camera.position.y = boat.boat.position.y + 10
            camera.lookAt(boat.boat.position)
        }
    }

    updatePirate()
    {
        if (this.boat)
        {
            // distance between boat and pirate
            let distance = Math.sqrt(Math.pow(this.boat.position.x - boat.boat.position.x, 2) + Math.pow(this.boat.position.z - boat.boat.position.z, 2))
            // if distance is less than 100, then pirate is close to boat
            if (distance < 100)
            {
                // if pirate is close to boat, then rotate boat towards boat
                this.speed.rot = (Math.PI - this.boat.rotation.y) - boat.boat.rotation.y
                this.speed.rot = this.speed.rot * 0.1
                this.speed.rot = Math.min(this.speed.rot, 0.1)

                this.boat.rotation.y += this.speed.rot
            }
            else
            {
                // Get random direction to move
                let direction = Math.random()

                // if pirate is far from boat, then accelerate boat
                if (this.notAccelerating)
                {
                    this.speed.vel += this.speed.acc
                    this.notAccelerating = false
                }
                else
                {
                    this.speed.vel += this.speed.acc
                }
            }
        }
    }
}

const pirates = []
const PIRATECOUNT = 10

let boatModel = null
async function createBoat()
{
    if(!boatModel)
        boatModel = await loadModel("assets/boat/scene.gltf")
    return new Boat(boatModel.clone())
}

const boat = await createBoat()

for (let i = 0; i < PIRATECOUNT; i++)
    pirates.push(await createBoat())

class Treasure
{
    constructor(_scene)
    {
        scene.add( _scene )
        _scene.scale.set(0.25, 0.25, 0.25)
        _scene.position.set(random(-10000, 10000), -.5, random(-10000, 10000))

        this.treasure = _scene
    }
}

async function loadModel(url)
{
    return new Promise((resolve, reject) => { loader.load(url, (gltf) => { resolve(gltf.scene) }) })
}

let treasureModel = null
async function createTreasure()
{
    if(!treasureModel)
        treasureModel = await loadModel("assets/treasure/scene.gltf")
    return new Treasure(treasureModel.clone())
}

let treasurees = []
const treasureCount = 1000

init();
animate();

async function init()
{
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 20000 );
    camera.position.set( 30, 30, 100 );

    sun = new THREE.Vector3();

    // Water

    const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );

    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load( 'assets/waternormals.jpg', function ( texture ) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            } ),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );

    water.rotation.x = - Math.PI / 2;

    scene.add( water );

    // Skybox

    const sky = new Sky();
    sky.scale.setScalar( 10000 );
    scene.add( sky );

    const skyUniforms = sky.material.uniforms;

    skyUniforms[ 'turbidity' ].value = 10;
    skyUniforms[ 'rayleigh' ].value = 2;
    skyUniforms[ 'mieCoefficient' ].value = 0.005;
    skyUniforms[ 'mieDirectionalG' ].value = 0.8;

    const parameters =
    {
        elevation: 2,
        azimuth: 180
    };

    const pmremGenerator = new THREE.PMREMGenerator( renderer );

    function updateSun()
    {
        const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
        const theta = THREE.MathUtils.degToRad( parameters.azimuth );

        sun.setFromSphericalCoords( 1, phi, theta );

        sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
        water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

        scene.environment = pmremGenerator.fromScene( sky ).texture;
    }

    updateSun();

    controls = new OrbitControls( camera, renderer.domElement );
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set( 0, 10, 0 );
    controls.minDistance = 40.0;
    controls.maxDistance = 200.0;
    controls.update();

    const waterUniforms = water.material.uniforms;

    for(let i = 0; i < treasureCount; i++)
    {
        const treasure = await createTreasure()
        treasurees.push(treasure)
    }

    window.addEventListener( 'resize', onWindowResize );

    window.addEventListener( 'keydown', function(e)
    {
        if(e.key == "w" || e.key == "ArrowUp")
            boat.speed.vel += boat.speed.acc, boat.notAccelerating = false
        if(e.key == "s" || e.key == "ArrowDown")
            boat.speed.vel -= boat.speed.acc, boat.notAccelerating = false
        if(e.key == "d" || e.key == "ArrowLeft")
            boat.speed.rot = -0.02, boat.notRotating = false
        if(e.key == "a" || e.key == "ArrowRight")
            boat.speed.rot = 0.02, boat.notRotating = false

        if (Math.abs(boat.speed.vel) > boat.speed.maxVel)
            boat.speed.vel = boat.speed.maxVel * Math.sign(boat.speed.vel)
    })

    window.addEventListener( 'keyup', function(e)
    {
        if(e.key == "w" || e.key == "s" || e.key == "ArrowUp" || e.key == "ArrowDown")
            boat.notAccelerating = true
        if(e.key == "d" || e.key == "a" || e.key == "ArrowLeft" || e.key == "ArrowRight")
            boat.notRotating = true
    })
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function isColliding(obj1, obj2)
{
    return (
        Math.abs(obj1.position.x - obj2.position.x) < 15 &&
        Math.abs(obj1.position.z - obj2.position.z) < 15
    )
}

function checkCollisions()
{
    if(boat.boat)
    {
        treasurees.forEach(treasure =>
        {
            if(treasure.treasure)
                if(isColliding(boat.boat, treasure.treasure))
                    scene.remove(treasure.treasure)
        })
    }
}

function changeSpeed()
{
    if (boat.boat)
    {
        if (boat.notAccelerating)
            boat.speed.vel = Math.abs(boat.speed.vel) > boat.speed.acc * 3 ? boat.speed.vel - boat.speed.acc * 3 * Math.sign(boat.speed.vel) : 0

        if (boat.notRotating)
            boat.speed.rot = Math.abs(boat.speed.rot) > 0.002 ? boat.speed.rot - 0.002 * Math.sign(boat.speed.rot) : 0
    }
}

function animate()
{
    requestAnimationFrame( animate );
    render();
    boat.update()
    changeSpeed()
    for (let i = 0; i < PIRATECOUNT; ++i)
        pirates[i].updatePirate()
    checkCollisions()
}

function render()
{
    water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
    renderer.render( scene, camera );
}
