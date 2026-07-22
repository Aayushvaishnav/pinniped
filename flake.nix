# Fork-only file: `nix build .#pinniped` / `nix run .#cinny` builds and runs the
# Cinny Electron app from source. The package itself lives in package.nix.
{
  description = "Pinniped - Yet another Matrix client (Cinny fork, Electron app built from source)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          pinniped = pkgs.callPackage ./package.nix { };
          cinny = self.packages.${system}.pinniped; # alias for the old name
          default = self.packages.${system}.pinniped;
        }
      );
    };
}
