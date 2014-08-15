# Scheme.js

A toy lisp interpreter based on [lis.py](http://norvig.com/lispy.html).

See it in your browser: https://abstractOwl.github.io/scheme.js


## Try some of these:

Simple addition:

    (+ 1 1)

Conditional:

    (if (< 5 10) (+ 2 3) (+ 5 8))

Defining Function:

    (begin (define add (lambda (x y) (+ x y))) (add 2 3))

Factorial:

    (begin (define factorial (lambda (n) (if (= n 0) 1 (* n (factorial (- n 1)))))) (factorial 10))


## Notes:

    * Because JS is dynamically typed and we're relying heavily on the
      Javascript interpreter, we run into oddities like:

        > (+ (quote Foo) 1)
        Foo1
