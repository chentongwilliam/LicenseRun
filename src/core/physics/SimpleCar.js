import * as THREE from 'three';

export class SimpleCar {
    // 1. Add a defaultConfig static property for fallback
    static defaultConfig = {
        name: "PixelCar",
        body: {
            size: [1.5, 0.7, 4],
            position: [0, 0.75, 0],
            color: "#3ec6f3"
        },
        chassis: {
            size: [2.2, 0.5, 2],
            position: [0, 0.6, 0],
            color: "#3ec6f3"
        },
        arch: [
            { size: [0.7, 0.1, 0.9], position: [-0.75, 0.85, 1.5], color: "#3ec6f3" },
            { size: [0.7, 0.1, 0.9], position: [0.75, 0.85, 1.5], color: "#3ec6f3" },
            { size: [0.7, 0.1, 0.9], position: [-0.75, 0.85, -1.5], color: "#3ec6f3" },
            { size: [0.7, 0.1, 0.9], position: [0.75, 0.85, -1.5], color: "#3ec6f3" }
        ],
        roof: {
            size: [1.6, 0.6, 3],
            position: [0, 1.3, -0.5],
            color: "#3ec6f3"
        },
        hood: {
            size: [1, 0.4, 0.2],
            position: [0, 0.55, 1.55],
            color: "#3ec6f3"
        },
        trunk: {
            size: [2.2, 0.4, 0.2],
            position: [0, 0.6, -2],
            color: "#3ec6f3"
        },
        bumpers: [
            { size: [2.3, 0.25, 0.3], position: [0, 0.38, 2.1], color: "#e0e0e0" },
            { size: [2.3, 0.25, 0.3], position: [0, 0.38, -2.15], color: "#e0e0e0" }
        ],
        wheel: {
            radius: 0.4,
            width: 0.3,
            color: "#222222"
        },
        headlight: [
            { radius: 0.15, height: 0.08, position: [-0.5, 0.65, 2.18], color: "#ffe066" },
            { radius: 0.15, height: 0.08, position: [0.5, 0.65, 2.18], color: "#ffe066" }
        ],
        taillight: [
            { size: [0.18, 0.18, 0.08], position: [-0.5, 0.65, -2.18], color: "#ffa500" },
            { size: [0.18, 0.18, 0.08], position: [0.5, 0.65, -2.18], color: "#ffa500" }
        ],
        window: [
            { size: [0.04, 0.45, 0.8], position: [-0.81, 1.25, 0.3], color: "#222a3a", opacity: 0.7 },
            { size: [0.04, 0.45, 1.2], position: [-0.81, 1.25, -1], color: "#222a3a", opacity: 0.7 },
            { size: [0.04, 0.45, 0.8], position: [0.81, 1.25, 0.3], color: "#222a3a", opacity: 0.7 },
            { size: [0.04, 0.45, 1.2], position: [0.81, 1.25, -1], color: "#222a3a", opacity: 0.7 },
            { size: [1.4, 0.45, 0.04], position: [0, 1.25, 1], color: "#222a3a", opacity: 0.7 },
            { size: [1.4, 0.3, 0.04], position: [0, 1.35, -2], color: "#222a3a", opacity: 0.7 }
        ],
        mirror: [
            { size: [0.12, 0.2, 0.12], position: [-0.86, 1.2, 1], color: "#888888" },
            { size: [0.12, 0.2, 0.12], position: [0.86, 1.2, 1], color: "#888888" }
        ]
    };

    constructor(scene, config = null) {
        this.scene = scene;
        this.config = config || SimpleCar.defaultConfig;
        this.car = new THREE.Group();
        this.wheels = [];
        this.steeringAngle = 0; // 当前前轮转向角
        this.targetSteering = 0; // 目标转向角
        this.wheelRotation = 0; // 轮子自转速度
        this.speed = 0; // 车速（米/秒）
        this.maxSpeed = 12; // 最大速度（米/秒）
        this.acceleration = 4; // 加速度
        this.deceleration = 0.001; // 松开油门时减速度
        this.brakeDeceleration = 10; // 倒车/刹车减速度
        this.steeringSpeed = Math.PI * 5; // 降低转向角变化速度，使转向更平滑
        this.maxSteering = Math.PI / 3; // 保持最大转向角45度
        this.wheelBase = 2.5; // 轴距
        this.car.position.set(0, 0, 0);
        this.car.rotation.y = 0;
        this.groundLimit = 49; // 地面边界（正负50内）
        this.createCar();
        this.scene.add(this.car);
        this.isReversing = false; // 是否倒车
    }

    createCar() {
        // Remove old car parts if re-creating
        while (this.car.children.length > 0) {
            this.car.remove(this.car.children[0]);
        }
        // Helper: create a box mesh from config
        const createBox = (cfg) => {
            if (!cfg.size) {
                console.warn('Box config missing size:', cfg);
                return null;
            }
            const geo = new THREE.BoxGeometry(...cfg.size);
            const mat = new THREE.MeshPhongMaterial({ color: cfg.color, transparent: !!cfg.opacity, opacity: cfg.opacity ?? 1 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(...cfg.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        };
        // Helper: create a cylinder mesh from config
        const createCylinder = (cfg, axis = 'x') => {
            const geo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.height, 32);
            const mat = new THREE.MeshPhongMaterial({ color: cfg.color, transparent: !!cfg.opacity, opacity: cfg.opacity ?? 1 });
            const mesh = new THREE.Mesh(geo, mat);
            if (axis === 'x') mesh.rotation.x = Math.PI / 2;
            if (cfg.position) mesh.position.set(...cfg.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        };
        // 1. Body
        if (this.config.body) {
            const body = createBox(this.config.body);
            this.body = body;
            this.car.add(body);
        }
        // 2. Chassis
        if (this.config.chassis) {
            const chassis = createBox(this.config.chassis);
            this.chassis = chassis;
            this.car.add(chassis);
        }
        // 3. Arch (array)
        if (Array.isArray(this.config.arch)) {
            this.config.arch.forEach(cfg => {
                const mesh = createBox(cfg);
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 4. Roof
        if (this.config.roof) {
            const mesh = createBox(this.config.roof);
            if (mesh instanceof THREE.Object3D) this.car.add(mesh);
        }
        // 5. Hood
        if (this.config.hood) {
            const mesh = createBox(this.config.hood);
            if (mesh instanceof THREE.Object3D) this.car.add(mesh);
        }
        // 6. Trunk
        if (this.config.trunk) {
            const mesh = createBox(this.config.trunk);
            if (mesh instanceof THREE.Object3D) this.car.add(mesh);
        }
        // 7. Bumpers (array)
        if (Array.isArray(this.config.bumpers)) {
            this.config.bumpers.forEach(cfg => {
                const mesh = createBox(cfg);
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 8. Wheels (special: still用原有分组逻辑)
        if (this.config.wheel) {
            const wheelRadius = this.config.wheel.radius;
            const wheelWidth = this.config.wheel.width;
            const wheelColor = this.config.wheel.color;
            const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 32);
            const wheelMaterial = new THREE.MeshPhongMaterial({ color: wheelColor });
            // Front left wheel (in group for steering)
            const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            frontLeftWheel.rotation.z = Math.PI / 2;
            frontLeftWheel.position.set(0, 0, 0); // Local to group
            frontLeftWheel.castShadow = true;
            frontLeftWheel.receiveShadow = true;
            // Front right wheel (in group for steering)
            const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            frontRightWheel.rotation.z = Math.PI / 2;
            frontRightWheel.position.set(0, 0, 0); // Local to group
            frontRightWheel.castShadow = true;
            frontRightWheel.receiveShadow = true;
            // Rear left wheel (directly to car)
            const rearLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            rearLeftWheel.rotation.z = Math.PI / 2;
            rearLeftWheel.position.set(-1, wheelRadius, -1.5);
            rearLeftWheel.castShadow = true;
            rearLeftWheel.receiveShadow = true;
            this.car.add(rearLeftWheel);
            // Rear right wheel (directly to car)
            const rearRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            rearRightWheel.rotation.z = Math.PI / 2;
            rearRightWheel.position.set(1, wheelRadius, -1.5);
            rearRightWheel.castShadow = true;
            rearRightWheel.receiveShadow = true;
            this.car.add(rearRightWheel);
            // Front wheels group for steering
            this.frontLeftGroup = new THREE.Group();
            this.frontLeftGroup.add(frontLeftWheel);
            this.frontLeftGroup.position.set(-1, wheelRadius, 1.5);
            this.car.add(this.frontLeftGroup);
            this.frontRightGroup = new THREE.Group();
            this.frontRightGroup.add(frontRightWheel);
            this.frontRightGroup.position.set(1, wheelRadius, 1.5);
            this.car.add(this.frontRightGroup);
            // Wheels array for animation (only mesh, not group)
            this.wheels = [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel];
            this.frontWheels = [this.frontLeftGroup, this.frontRightGroup];
        }
        // 9. Headlights (array, cylinder)
        if (Array.isArray(this.config.headlight)) {
            this.config.headlight.forEach(cfg => {
                const mesh = createCylinder(cfg, 'x');
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 10. Taillights (array, box)
        if (Array.isArray(this.config.taillight)) {
            this.config.taillight.forEach(cfg => {
                const mesh = createBox({ ...cfg, opacity: 1 });
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 11. Windows (array, box)
        if (Array.isArray(this.config.window)) {
            this.config.window.forEach(cfg => {
                const mesh = createBox(cfg);
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 12. Mirrors (array, box)
        if (Array.isArray(this.config.mirror)) {
            this.config.mirror.forEach(cfg => {
                const mesh = createBox(cfg);
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
    }

    update(deltaTime) {
        // 1. 渐进转向
        const steerDelta = this.steeringSpeed * deltaTime;
        if (this.steeringAngle < this.targetSteering) {
            this.steeringAngle = Math.min(this.steeringAngle + steerDelta, this.targetSteering);
        } else if (this.steeringAngle > this.targetSteering) {
            this.steeringAngle = Math.max(this.steeringAngle - steerDelta, this.targetSteering);
        }

        // 2. 车身移动和转向物理
        if (Math.abs(this.speed) > 0.01) {
            // 计算转弯半径
            const beta = Math.tan(this.steeringAngle) * this.speed / this.wheelBase;
            this.car.rotation.y += beta * deltaTime;
            // 计算前进方向
            const forward = new THREE.Vector3(Math.sin(this.car.rotation.y), 0, Math.cos(this.car.rotation.y));
            this.car.position.add(forward.multiplyScalar(this.speed * deltaTime));
        }
        // 3. 轮子动画
        // 前轮转向
        this.frontLeftGroup.rotation.y = this.steeringAngle;
        this.frontRightGroup.rotation.y = this.steeringAngle;
        // 所有轮子自转
        this.wheels.forEach(wheel => {
            wheel.rotation.x += this.wheelRotation * deltaTime;
        });
        // 4. 简单阻力和倒车逻辑
        if (this.isReversing) {
            if (this.wheelRotation !== 0) {
                this.speed -= this.acceleration * deltaTime;
                this.speed = Math.max(-this.maxSpeed / 2, this.speed); // 倒车最大速度一半
            } else {
                // 松开S时倒车自动减速
                if (this.speed < -0.01) {
                    this.speed += this.brakeDeceleration * deltaTime;
                    if (this.speed > 0) this.speed = 0;
                }
            }
        } else {
            if (Math.abs(this.speed) > 0.01 && this.wheelRotation === 0) {
                // 松开油门时自动减速
                const sign = this.speed > 0 ? 1 : -1;
                this.speed -= sign * this.deceleration * deltaTime;
                if (sign * this.speed < 0) this.speed = 0;
            }
        }
        // 5. 边界碰撞检测
        const p = this.car.position;
        let hit = false;
        if (p.x < -this.groundLimit) { p.x = -this.groundLimit; hit = true; }
        if (p.x > this.groundLimit) { p.x = this.groundLimit; hit = true; }
        if (p.z < -this.groundLimit) { p.z = -this.groundLimit; hit = true; }
        if (p.z > this.groundLimit) { p.z = this.groundLimit; hit = true; }
        if (hit) this.speed = 0;
    }

    setSteering(value) {
        // 直接设置目标转向角，让 update 方法处理平滑过渡
        this.targetSteering = Math.max(-this.maxSteering, Math.min(this.maxSteering, value));
    }

    setWheelRotation(value) {
        // 直接设置轮子旋转速度，让 update 方法处理平滑过渡
        this.wheelRotation = value;
        
        // console.log('轮子旋转速度:', value);
        // 根据轮子旋转速度计算加速度
        const accelerationFactor = Math.abs(value) * this.acceleration;
        
        // 正常前进
        if (value > 0) {
            this.isReversing = false;
            this.speed += accelerationFactor * 0.016;
            this.speed = Math.min(this.maxSpeed, this.speed);
            // console.log('前进速度:', this.speed);
        }
        // 倒车逻辑
        else if (value <= 0) {
            // 如果速度为正（向前），先减速到0
            if (this.speed > 0.01) {
                this.speed -= this.brakeDeceleration * 0.016;
                if (this.speed < 0) this.speed = 0;
                // console.log('减速速度:', this.speed);
            }
            // 速度接近0时，开始倒车
            else if (this.speed <= 0.01) {  // 修改判断条件
                this.isReversing = true;
                this.speed -= accelerationFactor * 0.016;
                this.speed = Math.max(-this.maxSpeed / 2, this.speed); // 倒车最大速度一半
                // console.log('倒车速度:', this.speed);
            }
        }
        // 松开时不加速，让 update 方法处理减速
    }

    getSpeedKmh() {
        // 返回绝对速度，单位km/h
        return Math.abs(this.speed) * 3.6;
    }

    // 3. Add fromConfig method
    fromConfig(config) {
        this.config = config;
        // Remove old car
        while (this.car.children.length > 0) {
            this.car.remove(this.car.children[0]);
        }
        this.createCar();
    }
} 