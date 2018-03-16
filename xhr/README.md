# What is this?

`web3-provider-engine` requires `xhr`, which as a side effect of requirement instantiates an `XMLHTTPRequest` instance. Since we're running the provider in a service worker, this throws an error. This package stubs out the `xhr` dependency. 
