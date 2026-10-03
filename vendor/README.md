# Data and normalization provenance

The GSoC import uses annual data from [nishantwrp/gsoc-organizations](https://github.com/nishantwrp/gsoc-organizations), commit `73961070242dcd5b7b3b0b42abf906012a6511ce`, under GPL-3.0. The unmodified files in `gsoc-filters/` are its name, category, topic, and technology normalizers; the upstream license is retained beside them. The package marker is added only to preserve their CommonJS behavior in an ESM project.

The SoB import reads [Jaydeep869/SOB_Organizations](https://github.com/Jaydeep869/SOB_Organizations), commit `8c73ebd590c90f68660ba8b8a629299c84641ebe`, under the MIT license retained in `sob-LICENSE`. This is a community historical dataset, not an official current application feed. Its data is parsed as JSON, never executed. Personal contributor/mentor names, universities, countries, and long project descriptions are deliberately excluded from the normalized snapshots.

Each snapshot retains source revisions, dates, URLs, and program/year attribution.

Logos and upstream organization descriptions retain their respective authors' rights. Linking to an upstream resource does not imply a separate asset license. SoB source avatars with malformed IDs or personal fork images are omitted.
