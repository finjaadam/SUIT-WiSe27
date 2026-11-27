import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const targetTilt = { pitch: 0, roll: 0 };
// Set by main() once the physics world exists
let resetBallInWorld = () => {};
let onGoalCallback = () => {};
let onTrapCallback = () => {};
let onBallLostCallback = () => {};
let paused = false;

export function resetBall() {
    resetBallInWorld();
}

export function onGoalReached(callback) {
    onGoalCallback = callback;
}

export function onBallLost(callback) {
    onBallLostCallback = callback;
}

export function onTrapReached(callback) {
    onTrapCallback = callback;
}

export function setPaused(value) {
    paused = value;
}

export function setBoardTilt({forward, left}) {
    const MAX_TILT = 0.25;
    targetTilt.pitch = forward * MAX_TILT;
    targetTilt.roll  = left * MAX_TILT;
}

function main() {
    const canvas = document.querySelector('#base');
    const renderer = new THREE.WebGLRenderer({antialias: true, canvas});

    // Kamera und Szene (Three.js)
    const fov = 60; 
    const aspect = window.innerWidth / window.innerHeight;  
    const near = 0.1;
    const far = 100; 
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();

    // Physik-Welt (cannon-es)
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0), //Erdanziehung
    });

    // Physik-Materialien (cannon-es)
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial,
        defaultMaterial,
        {
            friction: 0.5,    // Reibung
            restitution: 0.0, // Elastizität auf 0 gegen Hoppeln
        }
    );
    world.addContactMaterial(defaultContactMaterial);
    world.defaultContactMaterial = defaultContactMaterial;

    // Plattform (Three.js)
    const plateWidth = 15;
    const plateHeight = 0.5;
    const plateDepth = 10;
    const ballRadius = 0.5;
    const holeRadius = 1.1;

    const holes = [
        { x:  0.0, z: -2.5, radius: holeRadius, type: 'trap', color: 0xff2222 },
        { x: -4.2, z:  2.2, radius: holeRadius, type: 'trap', color: 0xff2222 },
        { x:  4.2, z:  2.2, radius: holeRadius, type: 'goal', color: 0x22dd44 },
    ];

    const plateShape2D = new THREE.Shape();
    plateShape2D.moveTo(-plateWidth / 2, -plateDepth / 2);
    plateShape2D.lineTo( plateWidth / 2, -plateDepth / 2);
    plateShape2D.lineTo( plateWidth / 2,  plateDepth / 2);
    plateShape2D.lineTo(-plateWidth / 2,  plateDepth / 2);
    plateShape2D.closePath();

    holes.forEach(hole => {
        const holePath = new THREE.Path();
        holePath.absarc(hole.x, -hole.z, hole.radius, 0, Math.PI * 2, true);
        plateShape2D.holes.push(holePath);
    });

    const geometry = new THREE.ExtrudeGeometry(plateShape2D, {
        depth: plateHeight,
        bevelEnabled: false,
        curveSegments: 32,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -plateHeight / 2, 0);

    const material = new THREE.MeshPhongMaterial({color: 0x44aa88});
    const plate = new THREE.Mesh(geometry, material);
    scene.add(plate);

    let holeTriggered = false;
    let goalRingMesh = null;

    holes.forEach(hole => {
        const ringGeo = new THREE.RingGeometry(hole.radius, hole.radius + 0.2, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: hole.color, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(hole.x, (plateHeight / 2) + 0.01, hole.z);
        plate.add(ring);

        if (hole.type === 'goal') {
            goalRingMesh = ring;
        }
    });

    // Plattform-Body (cannon-es)
    const plateBody = new CANNON.Body({
        type: CANNON.Body.KINEMATIC,
    });

    function addPlateBox(minX, maxX, minZ, maxZ) {
        const w = maxX - minX;
        const d = maxZ - minZ;
        const shape = new CANNON.Box(new CANNON.Vec3(w / 2, plateHeight / 2, d / 2));
        plateBody.addShape(shape, new CANNON.Vec3(minX + w / 2, 0, minZ + d / 2));
    }

    const h = holeRadius * 0.78;
    addPlateBox(-7.5,  7.5, -5.0, -2.5 - h);
    addPlateBox(-7.5, -h,   -2.5 - h, -2.5 + h);
    addPlateBox( h,    7.5, -2.5 - h, -2.5 + h);
    addPlateBox(-7.5,  7.5, -2.5 + h,  2.2 - h);
    addPlateBox(-7.5,      -4.2 - h,  2.2 - h,  2.2 + h);
    addPlateBox(-4.2 + h,   4.2 - h,  2.2 - h,  2.2 + h);
    addPlateBox( 4.2 + h,   7.5,      2.2 - h,  2.2 + h);
    addPlateBox(-7.5,  7.5,  2.2 + h,  5.0);

    world.addBody(plateBody);

    // Ball (Three.js)
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({color: 0xff5533});
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    
    // Ball auf Platte setzen (Three.js)
    ball.position.set(0, (plateHeight / 2) + ballRadius, 1);
    scene.add(ball);

    // Kugel-Body (cannon-es)
    const ballShape = new CANNON.Sphere(ballRadius);
    const ballBody = new CANNON.Body({
        mass: 1,
        shape: ballShape,
        position: new CANNON.Vec3(0, 3, 1), 
        linearDamping: 0.2,
        angularDamping: 0.6, 
    });
    world.addBody(ballBody);

    function resetBall() {
        ballBody.position.set(0, 3, 1);
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        holeTriggered = false;
        if (goalRingMesh) {
            goalRingMesh.material.color.setHex(0x22dd44);
        }
    }
    resetBallInWorld = resetBall;

    // Licht (Three.js)
    const light = new THREE.DirectionalLight(0xFFFFFF, 2.5);
    light.position.set(5, 10, 7);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const currentTilt = { pitch: 0, roll: 0 };

    renderer.setSize(window.innerWidth, window.innerHeight);

    // Render- und Physik-Loop
    const timer = new THREE.Timer();

    function render(timestamp) {
        timer.update(timestamp);
        const deltaTime = Math.min(timer.getDelta(), 0.1); 

        if (!paused) {
            currentTilt.pitch += (targetTilt.pitch - currentTilt.pitch) * 0.1;
            currentTilt.roll += (targetTilt.roll - currentTilt.roll) * 0.1;

            plateBody.quaternion.setFromEuler(currentTilt.pitch, 0, currentTilt.roll);

            world.step(1 / 120, deltaTime, 5);
        }

        plate.position.copy(plateBody.position);
        plate.quaternion.copy(plateBody.quaternion);

        ball.position.copy(ballBody.position);
        ball.quaternion.copy(ballBody.quaternion);

        // Prüfen, sobald der Ball unter die Plattenoberfläche taucht
        const localBallPos = plate.worldToLocal(ball.position.clone());
        if (!holeTriggered && localBallPos.y < -0.1) {
            const hitHole = holes.find(h => {
                const dist = Math.hypot(localBallPos.x - h.x, localBallPos.z - h.z);
                return dist < h.radius;
            });

        if (hitHole) {
            holeTriggered = true;
            if (hitHole.type === 'goal') {
                if (goalRingMesh) {
                    goalRingMesh.material.color.setHex(0xffffff); // Ring blitzt kurz hell auf
                }
                onGoalCallback();
                } else if (hitHole.type === 'trap') {
                    onTrapCallback();
                }
            }
        }

        // Ball Reset
        if (ballBody.position.y < -2) {
            resetBall();
            onBallLostCallback();
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();