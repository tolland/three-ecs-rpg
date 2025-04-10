import * as THREE from 'three';
import { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface MergedGeometry {}

/**
 * this is a first attempt at a module approach to merging geometries as
 * based on the exmaples from threejs game demo, and the three-mesh-bvh
 * @TODO find a better way of making this pluggable. ideally to support
 * sectioning large models on the fly
 */
export class GenericMergedGeometry implements MergedGeometry {
    public mergedGeometries: BufferGeometry;

    constructor(private object3d: THREE.Object3D) {
        const geometriesToMerge: THREE.BufferGeometry[] = [];

        object3d.traverse((child: THREE.Object3D) => {
            const mesh = child as THREE.Mesh;
            // Select meshes that should be part of the collision world
            if (mesh.isMesh && mesh.geometry) {
                const clonedGeometry = mesh.geometry.clone(); // Clone geometry
                clonedGeometry.applyMatrix4(child.matrixWorld); // Apply world transform directly to geometry vertices

                // Debug UV attributes
                // console.log('Geometry UV attributes:', {
                //     name: child.name,
                //     hasUV: 'uv' in clonedGeometry.attributes,
                //     hasUV1: 'uv1' in clonedGeometry.attributes,
                //     attributes: Object.keys(clonedGeometry.attributes),
                // });

                // Ensure consistent attributes
                if (!('uv1' in clonedGeometry.attributes)) {
                    // Add empty UV1 attribute if missing
                    const vertexCount =
                        clonedGeometry.attributes.position.count;
                    const uv1Array = new Float32Array(vertexCount * 2);
                    clonedGeometry.setAttribute(
                        'uv1',
                        new THREE.BufferAttribute(uv1Array, 2),
                    );
                }

                // console.log('Adding geometry for collision:', {
                //     name: child.name,
                //     vertexCount: clonedGeometry.attributes.position.count,
                //     hasUV1: 'uv1' in clonedGeometry.attributes,
                // });
                geometriesToMerge.push(clonedGeometry);
            } else if ((child as THREE.InstancedMesh).isInstancedMesh) {
                console.warn(
                    'InstancedMesh collision not directly handled by simple merge, skipping:',
                    child.name,
                );
                // Handling InstancedMesh requires more complex BVH setup or per-instance checks
            }
        });
        if (geometriesToMerge.length === 0) {
            console.error(
                'No suitable geometries found in world GLTF to build BVH from!',
                'Scene contents:',
                this.object3d,
            );
            throw new Error('No geometries found to merge for collision');
        }
        // Merge geometries into one large geometry
        console.log(
            'Merging',
            geometriesToMerge.length,
            'geometries for collision',
        );
        this.mergedGeometries = mergeGeometries(geometriesToMerge, false);
        console.log(
            'Merged geometry created with',
            this.mergedGeometries.attributes.position.count,
            'vertices',
        );
        geometriesToMerge.forEach((g) => g.dispose()); // Dispose clones
    }
}
