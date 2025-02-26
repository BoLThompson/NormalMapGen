import './style.css'
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js'
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js'
import asteroidobj from "/models/asteroid/10464_Asteroid_v1_Iterations-2.obj?url"
import asteroidmtl from "/models/asteroid/10464_Asteroid_v1_Iterations-2.mtl?url"
// import asteroidobj from "/models/arwing/arwing.obj?url"
// import asteroidmtl from "/models/arwing/arwing.mtl?url"
// import {setupRGToggle, setupLightToggle} from 'rglights.js';

//threeJS boilerplate
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

//resizing handler
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize);

//diffuse, rgPos, and rgNeg scenes
var bufferScenes = 
  Array.from(Array(3), () => (new THREE.Scene()));
var bufferTextures = 
  Array.from(Array(3), () => (new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter}
  ))
);

//set up light for diffuse, rgPos and rgNeg
{
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 10.0);
  scene.add(ambientLight);
  bufferScenes[0].add(ambientLight);
  const rPosLight = new THREE.DirectionalLight(0xFF0000, 3.0);
  rPosLight.position.fromArray([1,0,0]);
  bufferScenes[1].add(rPosLight);
  const rNegLight = new THREE.DirectionalLight(0xFF0000, 3.0);
  rNegLight.position.fromArray([-1,0,0]);
  bufferScenes[2].add(rNegLight);
  const gPosLight = new THREE.DirectionalLight(0x00FF00, 3.0);
  gPosLight.position.fromArray([0,1,0]);
  bufferScenes[1].add(gPosLight);
  const gNegLight = new THREE.DirectionalLight(0x00FF00, 3.0);
  gNegLight.position.fromArray([0,-1,0]);
  bufferScenes[2].add(gNegLight);
}

//make a plane that we can display in normalized device coordinates
const geometry = new THREE.PlaneGeometry(2,2);
const fragShader = `
    uniform sampler2D texRgPos;
    uniform sampler2D texRgNeg;
    uniform sampler2D texDiffuse;
    uniform vec3 lhat;
    uniform int outType;
    uniform float specularity;
    varying vec2 vUv;

    void main() {
      //The textures are all in some color space I'm not expecting.
      //Something to do with HDR maybe?
      //the colorspace_fragment puts them to a range I can work with
      //maybe that's sRGB to linear conversion?      
      gl_FragColor = texture(texDiffuse, vUv);
      #include <colorspace_fragment>
      vec3 diffuse = gl_FragColor.xyz;      
      gl_FragColor = texture(texRgPos, vUv);
      #include <colorspace_fragment>
      vec3 rgPos = gl_FragColor.xyz;
      gl_FragColor = texture(texRgNeg, vUv);
      #include <colorspace_fragment>
      vec3 rgNeg = gl_FragColor.xyz;
      
      //generate a normal map based on 
      vec3 nmap = vec3(
        (rgPos - rgNeg).xy * 0.5,
        0
      );
      nmap.b = sqrt(1.0 - pow(nmap.r, 2.0) - pow(nmap.g, 2.0));
      nmap.xy += 0.5;

      if (outType == 0)
        gl_FragColor = vec4(diffuse,1.0);
      if (outType == 1)
        gl_FragColor = vec4(nmap,1.0);
      if (outType == 2)
        gl_FragColor = vec4(
          diffuse
            * pow((acos(dot(vec3(nmap.rg - 0.5, nmap.b), lhat)) / 3.14159),specularity)
        ,1.0);
      if (outType == 3)
        gl_FragColor = vec4(rgPos,1.0);
      if (outType == 4)
        gl_FragColor = vec4(rgNeg,1.0);
    }
  `;
const vertShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = modelMatrix * vec4(position, 1.0);
    }
  `;

//save a reference to the last plane cause we'll need to update its uniforms
var plane;

[
  {
    outType:0,  //diffuse
    scale: 1/3.0,
    tX: -0.5,
    tY: 2/3.0,
  },
  {
    outType:3,  //rgpos
    scale: 1/3.0,
    tX: -0.5,
    tY: 0,
  },
  {
    outType:4,  //rgneg
    scale: 1/3.0,
    tX: -0.5,
    tY: -2/3.0,
  },
  {
    outType:1, //normal map
    scale: .5,
    tX: 0.5,
    tY: 0.5,
  },
  {
    outType:2, //false lighting
    scale:.5,
    tX:0.5,
    tY:-0.5
  }
].forEach(p => {
  const thisPlane = new THREE.Mesh(geometry,     
    new THREE.ShaderMaterial({
      uniforms: {
        texRgPos: {
          value:bufferTextures[1].texture
        },
        texRgNeg: {
          value:bufferTextures[2].texture
        },
        texDiffuse: {
          value:bufferTextures[0].texture
        },
        lhat: {
          value: new THREE.Vector3(-1,0,0)
        },
        outType: {
          value: p.outType
        },
        specularity: {
          value: 1.0
        }
      },
      vertexShader: vertShader,
      fragmentShader: fragShader,
    })
  );
  thisPlane.matrixAutoUpdate = false;
  thisPlane.matrix.identity();
  thisPlane.matrix.premultiply(new THREE.Matrix4().makeScale(p.scale,p.scale,p.scale));
  thisPlane.matrix.premultiply(new THREE.Matrix4().makeTranslation(p.tX,p.tY,0));
  scene.add(thisPlane);

  plane = thisPlane;
})


var otherModels = [];
//geometry for the subject
const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();
var subject = false;
mtlLoader.load(
  asteroidmtl,
  (mtls) => {
    new Promise((resolve, reject) => {
      objLoader.load(asteroidobj, (obj) => {

        subject = obj;
        obj.matrixAutoUpdate = false;
        for (const bs in bufferScenes) {
          otherModels[bs] = obj.clone();
          bufferScenes[bs].add(otherModels[bs]);
        }
        resolve();
      })
    })
    .then(() => {
      objLoader.setMaterials(mtls);
      objLoader.load(asteroidobj,(obj) => {
        subject = obj;
        obj.matrixAutoUpdate = false;
        bufferScenes[0].remove(otherModels[0]);
        otherModels[0] = obj;
        bufferScenes[0].add(obj);
      })
    })
  }
)
// var subject = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshPhongMaterial());
// subject.matrixAutoUpdate = false;

// for (const bs in bufferScenes) {
//   otherModels[bs] = subject.clone();
//   bufferScenes[bs].add(otherModels[bs]);
// }

//get references to the UI controls
var modelControls = {
  scale: 0,
  xRot: 0,
  yRot: 0,
  zRot: 0,
  xTran: 0,
  yTran: 0,
  zTran: 0,
  specularity: 0,
}
for (const key of Object.entries(modelControls)) {
  modelControls[key[0]] = document.getElementById(key[0]);
}

function animate() {
  requestAnimationFrame(animate);

  //don't try to render anything until the subject is loaded in
  if (subject != false) {
    let theta = (new Date().getMilliseconds()) / 1000 * 2 * -3.14;
    plane.material.uniforms.lhat.value = new THREE.Vector3(Math.cos(theta), Math.sin(theta), -1).normalize();
    plane.material.uniforms.specularity.value = modelControls.specularity.value;

    const scale = modelControls.scale.value;
    subject.matrix.identity();
    subject.matrix.premultiply(
      new THREE.Matrix4().makeTranslation(modelControls.xTran.value, modelControls.yTran.value, modelControls.zTran.value)
    )
    subject.matrix.premultiply(
      new THREE.Matrix4().makeRotationZ(modelControls.zRot.value)
    );
    subject.matrix.premultiply(
      new THREE.Matrix4().makeRotationX(modelControls.xRot.value)
    );
    subject.matrix.premultiply(
      new THREE.Matrix4().makeRotationY(modelControls.yRot.value)
    );
    subject.matrix.premultiply(
      new THREE.Matrix4().makeScale(scale,scale,scale)
    );

    //render to the three buffers
    for (const i in bufferScenes) {
      otherModels[i].matrix.copy(subject.matrix);
      renderer.setRenderTarget(bufferTextures[i]);
      renderer.clear();
      renderer.render(bufferScenes[i], camera);
    }

    //render the five planes to our screen
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
  }
}

animate();