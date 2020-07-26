#include <resolver.hpp>

#include <rt.hpp>

using namespace rt;

void rt::render(const scene_t *scn)
{
	unsigned int w = scn->img->get_width();
	unsigned int h = scn->img->get_height();
	for (unsigned int i = 0; i < w; i++)
	{
		std::cout << i << std::endl;
		
		#pragma omp parallel for
		for (unsigned int j = 0; j < h; j++)
		{
			// std::cout << "inner=> " << j << '\n';
			ray_t ray;
			int d = scn->intg->depth;
			// get multisamples from image pixel
			std::vector<Eigen::Vector2f> samples = scn->img->multisample_pixel(i, j);
			color_t avg_col(0);
			for (auto psample : samples)
			{
				color_t col = scn->cam->sample_ray(ray, psample);
				col *= scn->intg->radiance(scn, ray, d);
				avg_col += col;
			}
			// take the avg val as color
			avg_col = avg_col / samples.size();
			scn->img->set_pixel(i, j, avg_col);
		}
	}
}

int main(int argc, char **argv)
{
	// set the random seed as current time
	srand48(time(0));
	srand(time(0));
	if (argc != 2)
	{
		std::cerr << "Syntax: " << argv[0] << " <scene.xml>" << std::endl;
		return -1;
	}

	filesystem::path path(argv[1]);

	try
	{
		if (path.extension() == "xml")
		{
			std::string scene_filename(argv[1]);
			rt::scene_t scn(scene_filename);
			rt::render(&scn);

			std::string img_filename = scene_filename;
			size_t lastdot = img_filename.find_last_of(".");
			if (lastdot != std::string::npos)
			{
				img_filename.erase(lastdot, std::string::npos);
			}
			img_filename += ".ppm";

			scn.img->write(img_filename);
		}
		else
		{
			std::cerr << "Error: Unknown file type." << std::endl;
			return -1;
		}
	}
	catch (const std::exception &e)
	{
		std::cerr << "Error: " << e.what() << std::endl;
		return -1;
	}

	return 0;
}
