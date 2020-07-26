#include <stochastic.hpp>

using namespace rt;

std::pair<double, double> stochastic_t::sample_direction()
{
    double theta = randuv(0, 1) * (M_PI / 2.0);
    double phi = randuv(0, 1) * (M_PI * 2.0);
    return std::make_pair(theta, phi);
}

std::vector<Vector3d> stochastic_t::generate_arc()
{
    std::vector<Vector3d> points;
    // push start point
    points.push_back(this->start);

    while (true)
    {
        Vector3d prevp = points[points.size() - 1];
        if (prevp.y() < this->end)
        {
            break;
        }

        std::pair<double, double> dir = this->sample_direction();
        double y = (-1 * this->h) * sin(dir.first);
        double x = this->h * sin(dir.second) * cos(dir.first);
        double z = this->h * cos(dir.second) * cos(dir.first);
        Vector3d delta(x, y, z);
        points.push_back(prevp + delta);
        // std::cout <<
    }
    return points;
}