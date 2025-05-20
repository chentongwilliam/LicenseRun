import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class VehicleManager {
  constructor(scene, world) {
    this.scene = scene
    this.world = world
    this.vehicles = new Map()
    this.loader = new GLTFLoader()
  }

  async loadVehicle(vehicleId, configPath) {
    try {
      // 加载配置文件
      const configResponse = await fetch(configPath)
      const config = await configResponse.json()
      
      // 加载模型
      const modelPath = `/src/assets/models/vehicles/${vehicleId}.glb`
      const gltf = await this.loader.loadAsync(modelPath)
      
      // 创建车辆对象
      const vehicleObj = {
        model: gltf.scene,
        config: config,
        parts: new Map(),
        physics: null,
        wheels: []
      }
      
      // 设置模型
      vehicleObj.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          
          // 存储部件引用
          if (child.name === config.parts.body.name) {
            vehicleObj.parts.set('body', child)
          } else if (child.name === config.parts.wheels.frontLeft.name) {
            vehicleObj.parts.set('frontLeft', child)
          } else if (child.name === config.parts.wheels.frontRight.name) {
            vehicleObj.parts.set('frontRight', child)
          } else if (child.name === config.parts.wheels.rear.name) {
            vehicleObj.parts.set('rear', child)
          }
        }
      })
      
      // 创建物理车身
      const bodyShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2))
      const bodyBody = new CANNON.Body({
        mass: config.parts.body.physics.mass,
        position: new CANNON.Vec3(0, 500, 0),
        shape: bodyShape,
        material: new CANNON.Material({
          friction: config.parts.body.physics.friction,
          restitution: config.parts.body.physics.restitution
        })
      })
      
      // 创建车辆物理系统
      const vehiclePhysics = new CANNON.RaycastVehicle({
        chassisBody: bodyBody,
        indexRightAxis: 0,
        indexForwardAxis: 2,
        indexUpAxis: 1
      })
      
      // 添加车轮
      const wheelOptions = {
        radius: config.parts.wheels.frontLeft.physics.radius,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        suspensionStiffness: config.parts.wheels.frontLeft.physics.suspensionStiffness,
        suspensionRestLength: config.parts.wheels.frontLeft.physics.suspensionRestLength,
        frictionSlip: config.parts.wheels.frontLeft.physics.friction,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: config.parts.wheels.frontLeft.physics.maxSuspensionForce,
        rollInfluence: 0.01,
        axleLocal: new CANNON.Vec3(0, 0, 1),
        maxSuspensionTravel: config.parts.wheels.frontLeft.physics.maxSuspensionTravel,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true
      }
      
      // 前轮
      const frontLeftWheel = vehiclePhysics.addWheel({
        ...wheelOptions,
        chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1)
      })
      
      const frontRightWheel = vehiclePhysics.addWheel({
        ...wheelOptions,
        chassisConnectionPointLocal: new CANNON.Vec3(1, 0, 1)
      })
      
      // 后轮
      const rearLeftWheel = vehiclePhysics.addWheel({
        ...wheelOptions,
        chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, -1)
      })
      
      const rearRightWheel = vehiclePhysics.addWheel({
        ...wheelOptions,
        chassisConnectionPointLocal: new CANNON.Vec3(1, 0, -1)
      })
      
      vehiclePhysics.addToWorld(this.world)
      
      // 存储车辆数据
      vehicleObj.physics = vehiclePhysics
      vehicleObj.wheels = [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel]
      
      this.vehicles.set(vehicleId, vehicleObj)
      this.scene.add(vehicleObj.model)
      
      return vehicleObj
    } catch (error) {
      console.error('Error loading vehicle:', error)
      throw error
    }
  }
  
  update(deltaTime) {
    this.vehicles.forEach(vehicle => {
      // 更新车轮位置和旋转
      vehicle.wheels.forEach((wheel, index) => {
        const wheelPart = vehicle.parts.get(
          index === 0 ? 'frontLeft' :
          index === 1 ? 'frontRight' :
          index === 2 ? 'rearLeft' : 'rearRight'
        )
        
        if (wheelPart) {
          // 更新车轮位置
          const position = wheel.position
          wheelPart.position.set(position.x, position.y, position.z)
          // 更新车轮旋转
          const rotation = wheel.rotation
          wheelPart.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
        }
      })
      
      // 更新车身位置和旋转
      const bodyPart = vehicle.parts.get('body')
      if (bodyPart) {
        const position = vehicle.physics.chassisBody.position
        bodyPart.position.set(position.x, position.y, position.z)
        const quaternion = vehicle.physics.chassisBody.quaternion
        bodyPart.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
      }
      // console.log('chassis pos:', vehicle.physics.chassisBody.position);
    })
  }
  
  applyEngineForce(vehicleId, force) {
    const vehicle = this.vehicles.get(vehicleId)
    if (vehicle) {
      console.log('applyEngineForce called', force);
      vehicle.physics.applyEngineForce(force, 2) // 后轮驱动
    }
  }
  
  setSteeringValue(vehicleId, value) {
    const vehicle = this.vehicles.get(vehicleId)
    if (vehicle) {
      vehicle.physics.setSteeringValue(value, 0) // 前轮转向
      vehicle.physics.setSteeringValue(value, 1)
      // 可视化前轮转向
      const left = vehicle.parts.get('frontLeft')
      const right = vehicle.parts.get('frontRight')
      if (left) left.rotation.y = value
      if (right) right.rotation.y = value
    }
  }
  
  applyBrake(vehicleId, force) {
    const vehicle = this.vehicles.get(vehicleId)
    if (vehicle) {
      vehicle.wheels.forEach(wheel => {
        vehicle.physics.setBrake(force, wheel)
      })
    }
  }
} 