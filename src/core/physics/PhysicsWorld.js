import * as CANNON from 'cannon-es'

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    })
    
    // 设置物理世界参数
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.allowSleep = true
    
    // 创建地面
    this.createGround()
  }
  
  createGround() {
    const groundShape = new CANNON.Plane()
    const groundBody = new CANNON.Body({
      mass: 0, // 静态物体
      material: new CANNON.Material({
        friction: 0.5,
        restitution: 0.3
      })
    })
    groundBody.addShape(groundShape)
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    this.world.addBody(groundBody)
  }
  
  update(deltaTime) {
    this.world.step(1/60, deltaTime, 3)
  }
} 