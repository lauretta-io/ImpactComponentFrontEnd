import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Link } from 'react-router-dom';
import { Camera, ZoomIn, ZoomOut, Home, Upload } from 'lucide-react';
import { parsePLYWithExpandedBuffer } from '../utils/plyParser';

export default function ModelViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasModel, setHasModel] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Mesh | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);

    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);
    console.log('Grid helper added to scene');

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    console.log('Three.js scene initialized');

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    loadLatestModel();

    broadcastRef.current = new BroadcastChannel('capture_channel');
    broadcastRef.current.onmessage = (event) => {
      if (event.data.type === 'capture_complete' && event.data.data?.ply_file_url) {
        loadModel(event.data.data.ply_file_url);
      }
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      broadcastRef.current?.close();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const loadLatestModel = () => {
    try {
      const latestCapture = localStorage.getItem('latest_capture');
      if (latestCapture) {
        const data = JSON.parse(latestCapture);
        if (data.ply_file_url) {
          loadModel(data.ply_file_url);
        }
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    }
  };

  const disposeModel = (model: any) => {
    if (!model) return;

    model.traverse((child: any) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  };

  const loadModel = (url: string, explicitExtension?: string) => {
    if (!sceneRef.current) return;

    setIsLoading(true);
    setError(null);

    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      disposeModel(modelRef.current);
      modelRef.current = null;
    }

    const fileExtension = explicitExtension || url.toLowerCase().split('.').pop();
    const isGLTF = fileExtension === 'gltf' || fileExtension === 'glb';

    console.log('Loading file with extension:', fileExtension, 'isGLTF:', isGLTF);

    if (isGLTF) {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          try {
            const model = gltf.scene;

            if (!model || model.children.length === 0) {
              throw new Error('glTF file contains no geometry');
            }

            model.traverse((child: any) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.needsUpdate = true;
                }
              }
            });

            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.sub(center);

            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);

            if (maxDim === 0 || !isFinite(maxDim)) {
              throw new Error('Invalid model dimensions');
            }

            const scale = 4 / maxDim;
            model.scale.multiplyScalar(scale);

            console.log('glTF model details:', {
              boundingBox: box,
              size: size,
              scale: scale,
              center: center,
              childCount: model.children.length
            });

            if (modelRef.current) {
              sceneRef.current!.remove(modelRef.current);
            }

            sceneRef.current!.add(model);
            modelRef.current = model as any;
            setHasModel(true);
            setIsLoading(false);
            setError(null);
            console.log('glTF model added to scene successfully');

            // Adjust camera to view the model
            if (cameraRef.current && controlsRef.current) {
              controlsRef.current.target.set(0, 0, 0);
              cameraRef.current.position.set(0, 2, 6);
              controlsRef.current.update();
            }
          } catch (err) {
            console.error('glTF processing error:', err);
            setError(`Failed to process glTF: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsLoading(false);
          }
        },
        (progress) => {
          console.log('glTF loading progress:', (progress.loaded / progress.total) * 100, '%');
        },
        (error) => {
          setError('Failed to load glTF file');
          setIsLoading(false);
          console.error('glTF loading error:', error);
        }
      );
    } else {
      // Load PLY file with custom parser that handles buffer expansion
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(buffer => {
          console.log('PLY file loaded, size:', buffer.byteLength, 'bytes');

          try {
            // Use custom parser with expanded buffer to prevent offset errors
            const geometry = parsePLYWithExpandedBuffer(buffer);
            console.log('PLY parsed successfully, vertices:', geometry.attributes.position?.count);

            if (!geometry.attributes.position || geometry.attributes.position.count === 0) {
              throw new Error('PLY file contains no vertices');
            }

            geometry.computeVertexNormals();

            // Use vertex colors if available, otherwise use solid color
            const hasColors = geometry.attributes.color !== undefined;
            const material = new THREE.MeshStandardMaterial({
              color: hasColors ? 0xffffff : 0x00a8ff,
              flatShading: false,
              side: THREE.DoubleSide,
              metalness: 0.3,
              roughness: 0.4,
              vertexColors: hasColors,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            geometry.computeBoundingBox();
            const bbox = geometry.boundingBox;

            if (bbox) {
              const center = new THREE.Vector3();
              bbox.getCenter(center);
              mesh.position.sub(center);

              const size = new THREE.Vector3();
              bbox.getSize(size);
              const maxDim = Math.max(size.x, size.y, size.z);

              if (maxDim > 0 && isFinite(maxDim)) {
                const scale = 4 / maxDim;
                mesh.scale.multiplyScalar(scale);
              }

              console.log('PLY mesh details:', {
                vertices: geometry.attributes.position?.count,
                hasColors: hasColors,
                boundingBox: bbox,
                size: size,
                center: center
              });
            }

            if (modelRef.current) {
              sceneRef.current!.remove(modelRef.current);
            }

            sceneRef.current!.add(mesh);
            modelRef.current = mesh;
            setHasModel(true);
            setIsLoading(false);
            setError(null);
            console.log('PLY model added to scene successfully');

            // Adjust camera to view the model
            if (cameraRef.current && controlsRef.current) {
              controlsRef.current.target.set(0, 0, 0);
              cameraRef.current.position.set(0, 2, 6);
              controlsRef.current.update();
            }
          } catch (err) {
            console.error('PLY parsing error:', err);
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(`PLY parsing failed: ${errorMsg}`);
            setIsLoading(false);
          }
        })
        .catch(error => {
          console.error('PLY load error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          setError(`Failed to load PLY file: ${errorMsg}`);
          setIsLoading(false);
        });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileUpload triggered');
    const files = event.target.files;
    console.log('Files:', files);

    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }

    const validExtensions = ['.ply', '.gltf', '.glb', '.bin'];
    const fileArray = Array.from(files);
    console.log('File array:', fileArray.map(f => f.name));

    // Look for main model file (.ply, .gltf, or .glb)
    const mainFile = fileArray.find((file) => {
      const ext = '.' + file.name.toLowerCase().split('.').pop();
      const isValid = ['.ply', '.gltf', '.glb'].includes(ext);
      console.log(`Checking ${file.name}, extension: ${ext}, valid: ${isValid}`);
      return isValid;
    });

    if (mainFile) {
      console.log('Main file found:', mainFile.name, 'Size:', mainFile.size, 'bytes');

      // Check if there's an accompanying .bin file for .gltf
      const fileExtension = mainFile.name.toLowerCase().split('.').pop() || '';
      if (fileExtension === 'gltf') {
        const binFile = fileArray.find(f => f.name.toLowerCase().endsWith('.bin'));
        if (binFile) {
          console.log('Found accompanying .bin file:', binFile.name);
        }
      }

      const url = URL.createObjectURL(mainFile);
      console.log('Blob URL created:', url);
      console.log('File extension:', fileExtension);
      loadModel(url, fileExtension);
    } else {
      const errorMsg = 'No valid .ply, .gltf, or .glb files found';
      setError(errorMsg);
      console.error(errorMsg, 'Files:', fileArray.map(f => f.name));
    }
  };

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0, 5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const zoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(0.8);
    }
  };

  const zoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(1.2);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="w-full h-full" />

      {!hasModel && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-gray-400 text-2xl mb-4">No Model Loaded</div>
            <div className="text-gray-500 text-sm">
              Capture images from the Camera page or upload .ply/.gltf/.glb files
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4 mx-auto"></div>
            <div className="text-gray-400 text-lg">Loading 3D model...</div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="absolute top-6 left-6 flex items-center gap-4">
        <Link
          to="/capture"
          className="bg-gray-800/80 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors backdrop-blur-sm"
        >
          <Camera size={20} />
          Switch to Dashboard View
        </Link>
        <label className="bg-blue-600/80 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors backdrop-blur-sm cursor-pointer">
          <Upload size={20} />
          Load Model Files
          <input
            type="file"
            accept=".ply,.gltf,.glb,.bin"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {hasModel && (
        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
          <button
            onClick={resetCamera}
            className="bg-gray-800/80 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors backdrop-blur-sm"
            title="Reset Camera"
          >
            <Home size={20} />
          </button>
          <button
            onClick={zoomIn}
            className="bg-gray-800/80 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors backdrop-blur-sm"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={zoomOut}
            className="bg-gray-800/80 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors backdrop-blur-sm"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
        </div>
      )}

      <div className="absolute bottom-6 left-6 bg-gray-800/80 text-white px-4 py-3 rounded-lg backdrop-blur-sm">
        <div className="text-xs text-gray-400 mb-1">Controls</div>
        <div className="text-sm space-y-1">
          <div><span className="text-blue-400">Left Click + Drag:</span> Rotate</div>
          <div><span className="text-blue-400">Right Click + Drag:</span> Pan</div>
          <div><span className="text-blue-400">Scroll:</span> Zoom</div>
        </div>
      </div>
    </div>
  );
}
