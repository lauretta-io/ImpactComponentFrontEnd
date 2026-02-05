import * as THREE from 'three';

type PLYFormat = 'ascii' | 'binary_little_endian' | 'binary_big_endian';

interface PLYHeader {
  format: PLYFormat;
  vertexCount: number;
  faceCount: number;
  headerLength: number;
  properties: {
    name: string;
    type: string;
  }[];
}

export function parsePLYWithExpandedBuffer(arrayBuffer: ArrayBuffer): THREE.BufferGeometry {
  // Create an expanded buffer with extra space to prevent offset errors
  const originalSize = arrayBuffer.byteLength;
  const expandedSize = originalSize + 1024 * 1024; // Add 1MB padding
  const expandedBuffer = new ArrayBuffer(expandedSize);

  // Copy original data to expanded buffer
  const originalView = new Uint8Array(arrayBuffer);
  const expandedView = new Uint8Array(expandedBuffer);
  expandedView.set(originalView, 0);

  console.log(`Expanded buffer from ${originalSize} to ${expandedSize} bytes`);

  // Parse header
  const header = parsePLYHeader(expandedView);
  console.log('PLY Header:', header);

  // Parse data based on format
  console.log(`Detected PLY format: ${header.format}`);

  switch (header.format) {
    case 'ascii':
      return parsePLYAscii(expandedView, header);
    case 'binary_little_endian':
      return parsePLYBinaryLittleEndian(expandedBuffer, header);
    case 'binary_big_endian':
      return parsePLYBinaryBigEndian(expandedBuffer, header);
    default:
      throw new Error(`Unsupported PLY format: ${header.format}`);
  }
}

function parsePLYHeader(uint8Array: Uint8Array): PLYHeader {
  const decoder = new TextDecoder('utf-8');
  let headerText = '';
  let headerLength = 0;

  // Find end_header
  for (let i = 0; i < Math.min(uint8Array.length, 10000); i++) {
    const char = String.fromCharCode(uint8Array[i]);
    headerText += char;

    if (headerText.includes('end_header')) {
      headerLength = i + 1;
      // Skip to next line after end_header
      while (headerLength < uint8Array.length &&
             (uint8Array[headerLength] === 10 || uint8Array[headerLength] === 13)) {
        headerLength++;
      }
      break;
    }
  }

  if (!headerText.includes('end_header')) {
    throw new Error('Invalid PLY file: end_header not found');
  }

  const lines = headerText.split('\n').map(line => line.trim());

  let format: PLYFormat | null = null;
  let vertexCount = 0;
  let faceCount = 0;
  const properties: { name: string; type: string }[] = [];

  let inVertexElement = false;

  for (const line of lines) {
    if (line.startsWith('format ')) {
      const formatString = line.substring(7).split(' ')[0].toLowerCase();

      // Validate and normalize format string
      if (formatString === 'ascii') {
        format = 'ascii';
      } else if (formatString === 'binary_little_endian') {
        format = 'binary_little_endian';
      } else if (formatString === 'binary_big_endian') {
        format = 'binary_big_endian';
      } else {
        throw new Error(`Unknown PLY format: ${formatString}`);
      }
    } else if (line.startsWith('element vertex ')) {
      vertexCount = parseInt(line.substring(15));
      inVertexElement = true;
    } else if (line.startsWith('element face ')) {
      faceCount = parseInt(line.substring(13));
      inVertexElement = false;
    } else if (line.startsWith('property ') && inVertexElement) {
      const parts = line.substring(9).split(' ');
      properties.push({
        type: parts[0],
        name: parts[1]
      });
    }
  }

  if (!format) {
    throw new Error('PLY format not specified in header');
  }

  return { format, vertexCount, faceCount, headerLength, properties };
}

function parsePLYAscii(uint8Array: Uint8Array, header: PLYHeader): THREE.BufferGeometry {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(uint8Array.slice(header.headerLength));
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Validate coordinate properties exist
  const hasX = header.properties.some(p => p.name === 'x');
  const hasY = header.properties.some(p => p.name === 'y');
  const hasZ = header.properties.some(p => p.name === 'z');

  if (!hasX || !hasY || !hasZ) {
    throw new Error('PLY file missing x, y, or z coordinates');
  }

  // Find property indices
  const xIndex = header.properties.findIndex(p => p.name === 'x');
  const yIndex = header.properties.findIndex(p => p.name === 'y');
  const zIndex = header.properties.findIndex(p => p.name === 'z');
  const redIndex = header.properties.findIndex(p => p.name === 'red');
  const greenIndex = header.properties.findIndex(p => p.name === 'green');
  const blueIndex = header.properties.findIndex(p => p.name === 'blue');

  console.log('Property indices - x:', xIndex, 'y:', yIndex, 'z:', zIndex);

  // Parse vertices
  for (let i = 0; i < header.vertexCount && i < lines.length; i++) {
    const values = lines[i].trim().split(/\s+/).map(Number);

    if (values.length >= 3) {
      const x = values[xIndex];
      const y = values[yIndex];
      const z = values[zIndex];

      positions.push(x, y, z);

      // Check for colors
      if (redIndex >= 0 && greenIndex >= 0 && blueIndex >= 0 &&
          values.length > Math.max(redIndex, greenIndex, blueIndex)) {
        const r = values[redIndex];
        const g = values[greenIndex];
        const b = values[blueIndex];
        colors.push(r / 255, g / 255, b / 255);
      }
    }
  }

  console.log(`ASCII: Parsed ${positions.length / 3} vertices with ${colors.length / 3} colors`);

  // Parse faces
  if (header.faceCount > 0) {
    const faceStartLine = header.vertexCount;
    for (let i = 0; i < header.faceCount && (faceStartLine + i) < lines.length; i++) {
      const values = lines[faceStartLine + i].trim().split(/\s+/).map(Number);
      const vertexCount = values[0];

      if (vertexCount === 3 && values.length >= 4) {
        indices.push(values[1], values[2], values[3]);
      } else if (vertexCount === 4 && values.length >= 5) {
        // Convert quad to two triangles
        indices.push(values[1], values[2], values[3]);
        indices.push(values[1], values[3], values[4]);
      }
    }
  }

  return createGeometry(positions, colors, indices);
}

function parsePLYBinaryLittleEndian(arrayBuffer: ArrayBuffer, header: PLYHeader): THREE.BufferGeometry {
  return parsePLYBinary(arrayBuffer, header, true);
}

function parsePLYBinaryBigEndian(arrayBuffer: ArrayBuffer, header: PLYHeader): THREE.BufferGeometry {
  return parsePLYBinary(arrayBuffer, header, false);
}

function parsePLYBinary(arrayBuffer: ArrayBuffer, header: PLYHeader, littleEndian: boolean): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Validate coordinate properties exist
  const hasX = header.properties.some(p => p.name === 'x');
  const hasY = header.properties.some(p => p.name === 'y');
  const hasZ = header.properties.some(p => p.name === 'z');

  if (!hasX || !hasY || !hasZ) {
    throw new Error('PLY file missing x, y, or z coordinates');
  }

  console.log(`Parsing binary PLY (${littleEndian ? 'Little Endian' : 'Big Endian'})`);
  console.log('Properties:', header.properties.map(p => `${p.name}(${p.type})`).join(', '));

  let offset = header.headerLength;

  // Calculate stride based on properties
  let stride = 0;
  const propertyOffsets: { [key: string]: number } = {};

  for (const prop of header.properties) {
    propertyOffsets[prop.name] = stride;

    switch (prop.type) {
      case 'float':
      case 'float32':
        stride += 4;
        break;
      case 'double':
      case 'float64':
        stride += 8;
        break;
      case 'uchar':
      case 'uint8':
        stride += 1;
        break;
      case 'short':
      case 'int16':
        stride += 2;
        break;
      case 'ushort':
      case 'uint16':
        stride += 2;
        break;
      case 'int':
      case 'int32':
        stride += 4;
        break;
      case 'uint':
      case 'uint32':
        stride += 4;
        break;
      default:
        stride += 4; // Default to 4 bytes
    }
  }

  console.log('Binary PLY stride:', stride, 'bytes per vertex');
  console.log('Property offsets:', propertyOffsets);

  // Parse vertices with safe boundary checking
  const safeVertexCount = Math.min(
    header.vertexCount,
    Math.floor((arrayBuffer.byteLength - offset) / stride)
  );

  console.log(`Reading ${safeVertexCount} vertices (requested ${header.vertexCount})`);

  for (let i = 0; i < safeVertexCount; i++) {
    const vertexOffset = offset + (i * stride);

    // Ensure we don't read beyond buffer
    if (vertexOffset + stride > arrayBuffer.byteLength) {
      console.warn(`Stopping at vertex ${i}: would exceed buffer bounds`);
      break;
    }

    const view = new DataView(arrayBuffer, vertexOffset, stride);

    try {
      // Read position
      const x = readProperty(view, 'x', propertyOffsets, header.properties, littleEndian);
      const y = readProperty(view, 'y', propertyOffsets, header.properties, littleEndian);
      const z = readProperty(view, 'z', propertyOffsets, header.properties, littleEndian);

      positions.push(x, y, z);

      // Read color if available
      if (propertyOffsets['red'] !== undefined) {
        const r = readProperty(view, 'red', propertyOffsets, header.properties, littleEndian);
        const g = readProperty(view, 'green', propertyOffsets, header.properties, littleEndian);
        const b = readProperty(view, 'blue', propertyOffsets, header.properties, littleEndian);
        colors.push(r / 255, g / 255, b / 255);
      }
    } catch (err) {
      console.error(`Error reading vertex ${i}:`, err);
      break;
    }
  }

  console.log(`Successfully read ${positions.length / 3} vertices`);

  return createGeometry(positions, colors, indices);
}

function readProperty(
  view: DataView,
  propName: string,
  offsets: { [key: string]: number },
  properties: { name: string; type: string }[],
  littleEndian: boolean
): number {
  const offset = offsets[propName];
  if (offset === undefined) return 0;

  const prop = properties.find(p => p.name === propName);
  if (!prop) return 0;

  try {
    switch (prop.type) {
      case 'float':
      case 'float32':
        return view.getFloat32(offset, littleEndian);
      case 'double':
      case 'float64':
        return view.getFloat64(offset, littleEndian);
      case 'uchar':
      case 'uint8':
        return view.getUint8(offset);
      case 'short':
      case 'int16':
        return view.getInt16(offset, littleEndian);
      case 'ushort':
      case 'uint16':
        return view.getUint16(offset, littleEndian);
      case 'int':
      case 'int32':
        return view.getInt32(offset, littleEndian);
      case 'uint':
      case 'uint32':
        return view.getUint32(offset, littleEndian);
      default:
        return 0;
    }
  } catch (err) {
    console.error(`Error reading property ${propName} at offset ${offset}:`, err);
    return 0;
  }
}

function createGeometry(positions: number[], colors: number[], indices: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  if (positions.length > 0) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    // Log coordinate ranges for debugging
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }

    console.log('Coordinate ranges:');
    console.log(`  X: ${minX.toFixed(3)} to ${maxX.toFixed(3)} (range: ${(maxX - minX).toFixed(3)})`);
    console.log(`  Y: ${minY.toFixed(3)} to ${maxY.toFixed(3)} (range: ${(maxY - minY).toFixed(3)})`);
    console.log(`  Z: ${minZ.toFixed(3)} to ${maxZ.toFixed(3)} (range: ${(maxZ - minZ).toFixed(3)})`);
    console.log(`Total vertices: ${positions.length / 3}`);
  }

  if (colors.length > 0) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    console.log(`Total colors: ${colors.length / 3}`);
  }

  if (indices.length > 0) {
    geometry.setIndex(indices);
    console.log(`Total faces: ${indices.length / 3}`);
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
