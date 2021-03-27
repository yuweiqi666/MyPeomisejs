(function(window) {
  /*
  promise 实例对象的状态定义为常量
  */
  const PENDING = "pending"
  const RESOLVED = "resolved"
  const REJECTED = "rejected"
  function MyPromise(exector) {
    /*
    保存this的指向
    */
    const self = this
    /*
    status 保存promise状态
    */
    self.status = PENDING
    /*
    data 保存成功/失败的结果
    */
    self.data = undefined
    /*
    callbacks保存promise成功/失败 触发的回调函数   [onResolved, onRejected]
    */
    self.callbacks = []
    /*
    定义resolve函数
    */
    function resolve(res) {
      if(self.status !== PENDING) {
        return
      }
        self.status = RESOLVED
        self.data = res
        // 判定回调函数中有没有数据   只有在现指定回调函数  在改变promise状态的情况下才触发下面的异步回调函数onResolved执行
        if(self.callbacks.length) {
          setTimeout(() => {
            self.callbacks.forEach(item => {
              item.onResolved(res)
            })
          }, 0);
        }
      
    }
    /*
    定义reject函数
    */
    function reject(err) {
      if(self.status !== PENDING) {
        return
      }
        self.status = REJECTED
        self.data = err
        // 判定回调函数中有没有数据   只有在现指定回调函数  在改变promise状态的情况下才触发下面的异步回调函数onRejected执行
        if(self.callbacks.length) {
          setTimeout(() => {
            self.callbacks.forEach(item => {
              item.onRejected(err)
            })
          }, 0);
        }
      
    }
    /**
     * 同步执行执行器函数
     * 
     * 当执行器函数执行时抛出异常 直接调用rejected函数
    */
    try {
      exector(resolve, reject)
    } catch (err) {
      reject(err)
    }
  }

  MyPromise.prototype.then = function(onResolved, onRejected) { 
    // 确保onResolved 是一个函数  如果不是函数  赋值一个默认函数  可以将值传递下去
    onResolved = typeof onResolved === "function" ? onResolved : res => res

    // 如果不指定onRejected回调函数  则给默认的函数  用于抛出异常    实现异常穿透
    onRejected = typeof onRejected === "function" ? onRejected : err => { throw err }

    const self = this

    return new MyPromise((resolve, reject) => {

      // handle函数主要是为了根据回调函数的返回结果来改变返回的promise的状态  一共有三种可能 1. 返回一个新的promise 2.返回不是一个promise  3、抛出异常
      function handle(callback) {
        try {
            const result = callback(self.data)
            // result 返回值为promise的情况
            if(result instanceof MyPromise) {
              result.then(resolve, reject)
            } else {
              // result 返回值不是promise的情况
              resolve(result)
            }
            } catch (err) {
              // 抛出异常 的情况
              reject(err)
            }
      }


      if(self.status === PENDING) {
        /*
         promise为pending状态时 保存回调函数 
        */
        self.callbacks.push({
          // 这样写主要是为了不仅要保存成功失败的回调函数  触发回调函数的同时改变返回promise的状态
          onResolved(value) {
            handle(onResolved)
          },
          onRejected(err) {
            handle(onRejected)
          }
        })
      } else if(self.status === RESOLVED) {
        /*
        promise状态的resolved时  异步执行onResolved回调函数
        */
        setTimeout(() => {
          /*
          then返回值几种可能
          1、抛出异常   return 失败的promise  失败的值为error
          2、返回的是promise对象   返回的值就是promise对象成功/失败的值
          3、返回的不是promise对象   返回成功的promise  成功的值就是当前的值
          */
          handle(onResolved)
        }, 0);
      } else if(self.status === REJECTED) {
        /*
        promise状态为rejected时   异步执行  onRejected函数
        */
        setTimeout(() => {
          /*
          then返回值几种可能
          1、抛出异常   return 失败的promise  失败的值为error
          2、返回的是promise对象   返回的值就是promise对象成功/失败的值
          3、返回的不是promise对象   返回成功的promise  成功的值就是当前的值
          */
          handle(onRejected)
        }, 0);
      }
    })

  }

  // MyPromise.prototype.then = function(onResolved, onRejected) {
  //   this.callbacks.push({
  //     onResolved,
  //     onRejected
  //   }) 
  // }


  MyPromise.prototype.catch = function(onRejected) {
    return this.then(undefined, onRejected)
  }
  /*
  MyPromise对象的resolve方法返回一个指定成功值得失败的promise对象
  */
  MyPromise.resolve = function(res) {
    return new MyPromise((resolve, reject) => {
      // res是一个promise对象
       if(res instanceof MyPromise) {
         res.then(resolve, reject)
       } else {
         // res不是一个promise对象
         resolve(res)
       }
    })
  }
  /*
  MyPromise对象的reject方法返回一个指定失败值得失败的promise对象
  */
  MyPromise.reject = function(err) {
    return new MyPromise((resolve, reject) =>{
      reject(err)
    })
  }
  
  MyPromise.all = function(arr) {   // arr为promise对象集合    语法上来讲也集合中的元素可以是非promise对象
    const result = []  // 用于保存所有的成功promise数据

    let count = 0   // 定义一个计数器 
    return new MyPromise((resolve, reject) => {
      arr.forEach((p, index) => {
        //MyPromise.resolve()   主要是防止 arr中的元素不是promise对象
        MyPromise.resolve(p).then(res => {
          count++
          result[index] = res
          // 计数器的值和数组的长度判断
          if(arr.length === count) {
            resolve(result)
          }
        }, err => {
          // 有多个失败的也不会重复调用  因为promise的状态只能改变一次
          reject(err)
        })
      })
    })
  }

  MyPromise.race = function(arr) { // arr是一个promise对象的集合  语法上来讲集合中的元素也可以是非promise对象
    return new MyPromise((resolve, reject) =>{
      arr.forEach(item => {
        //MyPromise.resolve()   主要是防止 arr中的元素不是promise对象
        if(item instanceof MyPromise) {
          item.then(
            res => {
              resolve(res)
            },
            err => {
              reject(err)
            }
          )
        } else {
          MyPromise.resolve(item).then(res => {
            resolve(res)
          }, err =>{
            reject(err)
          })
        }
        
      })
    })
  }


  window.MyPromise = MyPromise
})(window)