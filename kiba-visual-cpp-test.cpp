#include <cassert>
#include <iostream>
#include <string>

// Teste simples das etapas da animação do Kiba.
// O site continua usando JavaScript/CSS; este arquivo apenas valida a lógica
// esperada da sequência para facilitar testes de desenvolvimento.

enum class Stage { Walking, Arriving, Standing, Talking };

Stage stageAt(double seconds) {
    if (seconds < 4.9) return Stage::Walking;
    if (seconds < 5.7) return Stage::Standing;
    return Stage::Talking;
}

std::string name(Stage stage) {
    switch (stage) {
        case Stage::Walking: return "Walking";
        case Stage::Arriving: return "Arriving";
        case Stage::Standing: return "Standing";
        case Stage::Talking: return "Talking";
    }
    return "Unknown";
}

int main() {
    assert(stageAt(0.0) == Stage::Walking);
    assert(stageAt(3.5) == Stage::Walking);
    assert(stageAt(5.0) == Stage::Standing);
    assert(stageAt(5.7) == Stage::Talking);
    assert(stageAt(8.0) == Stage::Talking);

    std::cout << "Kiba animation test: OK\n";
    std::cout << "0.0s -> " << name(stageAt(0.0)) << "\n";
    std::cout << "5.0s -> " << name(stageAt(5.0)) << "\n";
    std::cout << "5.7s -> " << name(stageAt(5.7)) << "\n";
    return 0;
}
