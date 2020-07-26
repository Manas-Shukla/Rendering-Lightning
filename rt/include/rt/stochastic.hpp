#pragma once

#include <utils.hpp>
#include <vector>

namespace rt
{
    class stochastic_t
    {
    private:
        Eigen::Vector3d start;
        double end;
        double h;

    public:
        stochastic_t(Eigen::Vector3d _start, double _end, double _h)
            : start(_start), end(_end), h(_h)
        {
        }
        std::pair<double, double> sample_direction();
        std::vector<Vector3d> generate_arc();
    };
} // namespace rt