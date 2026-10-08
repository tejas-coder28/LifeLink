const registry = {};

function registerRepository(name, instance) {
  registry[name] = instance;
}

function getRepositoryRegistry() {
  return registry;
}

module.exports = {
  registerRepository,
  getRepositoryRegistry,
};
