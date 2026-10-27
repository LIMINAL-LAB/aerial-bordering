{
  description = "aerial-bordering dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs_22
            pkgs.just
            (pkgs.python3.withPackages (ps: [ ps.pillow ]))
            pkgs.libwebp # cwebp, for scripts/optimize_report_images.py
            pkgs.ffmpeg # re-encoding media in public/
          ];

          shellHook = ''
            echo "aerial-bordering dev env"
            echo "node $(node --version) | npm $(npm --version)"
          '';
        };
      });
}
