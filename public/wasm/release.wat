(module
 (type $0 (func (param i32 i32) (result i32)))
 (type $1 (func (param f32 f32 f32) (result f32)))
 (memory $0 0)
 (export "add" (func $assembly/index/add))
 (export "calculatePhysics" (func $assembly/gameLogic/calculatePhysics))
 (export "memory" (memory $0))
 (func $assembly/index/add (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  i32.add
 )
 (func $assembly/gameLogic/calculatePhysics (param $0 f32) (param $1 f32) (param $2 f32) (result f32)
  local.get $0
  local.get $0
  f32.mul
  local.get $1
  local.get $1
  f32.mul
  f32.add
  local.get $2
  local.get $2
  f32.mul
  f32.add
 )
)
